'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Building,
  Clock,
  DollarSign,
  Percent,
  CheckCircle2,
  Save,
  Globe,
  Bell,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { DEFAULT_RESTAURANT_ID } from '@/lib/supabase';

export default function AdminSettings() {
  const [savedToast, setSavedToast] = useState(false);

  // Form states
  const [restaurantName, setRestaurantName] = useState('PRATHOMIX Flagship Luxury Lounge');
  const [cuisineType, setCuisineType] = useState('Modern Luxury Gastronomy');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [email, setEmail] = useState('concierge@prathomix.com');
  const [address, setAddress] = useState('Level 42, Sky Tower, Financial District');
  const [city, setCity] = useState('Mumbai');

  // Financials & Operating parameters
  const [currency, setCurrency] = useState('INR');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [taxRate, setTaxRate] = useState(5.0);
  const [deliveryFee, setDeliveryFee] = useState(40.0);
  const [serviceCharge, setServiceCharge] = useState(0.0);
  const [openingTime, setOpeningTime] = useState('11:00');
  const [closingTime, setClosingTime] = useState('23:30');

  // System toggles
  const [onlineOrderingActive, setOnlineOrderingActive] = useState(true);
  const [soundAlertsActive, setSoundAlertsActive] = useState(true);
  const [autoKotPrint, setAutoKotPrint] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[#EAE6DF] tracking-wide"
            style={{ fontFamily: 'Cinzel, serif' }}>
            Restaurant Configuration & Operating Controls
          </h1>
          <p className="text-xs text-[#EAE6DF]/60 mt-1">
            Configure tenant establishment details, fiscal tax policies, service timings and direct ordering rules.
          </p>
        </div>

        {savedToast && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold animate-pulse">
            <CheckCircle2 className="w-4 h-4" />
            Configuration saved successfully!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Establishment Profile */}
        <div className="p-6 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/20 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#C5A880]/15">
            <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                Establishment Identity
              </h2>
              <span className="text-[11px] text-[#EAE6DF]/50">Public brand details displayed across customer apps</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Restaurant Name</label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
              />
            </div>
            <div>
              <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Cuisine & Concept</label>
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
              <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Executive Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
              />
            </div>
            <div>
              <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Street Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
              />
            </div>
            <div>
              <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">City & State</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
              />
            </div>
          </div>
        </div>

        {/* Financial & Fiscal Policies */}
        <div className="p-6 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/20 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#C5A880]/15">
            <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                Fiscal Policies & Currency Rules
              </h2>
              <span className="text-[11px] text-[#EAE6DF]/50">Taxes, delivery fees and billing calculations</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Base Currency</label>
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  setCurrencySymbol(e.target.value === 'INR' ? '₹' : e.target.value === 'USD' ? '$' : '€');
                }}
                className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]">
                <option value="INR">INR (₹ Indian Rupee)</option>
                <option value="USD">USD ($ US Dollar)</option>
                <option value="EUR">EUR (€ Euro)</option>
                <option value="AED">AED (د.إ Dirham)</option>
              </select>
            </div>
            <div>
              <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">GST / Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
              />
            </div>
            <div>
              <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Flat Delivery Fee (₹)</label>
              <input
                type="number"
                step="1"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
              />
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
            </div>
          </div>
        </div>

        {/* Operating Hours & Automations */}
        <div className="p-6 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/20 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#C5A880]/15">
            <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                Service Timings & Live Automations
              </h2>
              <span className="text-[11px] text-[#EAE6DF]/50">Dining room and kitchen service hours</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Daily Service Starts</label>
              <input
                type="time"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
              />
            </div>
            <div>
              <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Kitchen Last Call / Close</label>
              <input
                type="time"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
              />
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={onlineOrderingActive}
                onChange={(e) => setOnlineOrderingActive(e.target.checked)}
                className="w-4 h-4 rounded text-[#C5A880] bg-[#1A1A1A] border-[#C5A880]/30"
              />
              <span className="text-xs text-[#EAE6DF]">
                <strong>Accept Customer Direct Orders:</strong> When disabled, customers see &quot;Kitchen temporarily closed for online ordering&quot;.
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={soundAlertsActive}
                onChange={(e) => setSoundAlertsActive(e.target.checked)}
                className="w-4 h-4 rounded text-[#C5A880] bg-[#1A1A1A] border-[#C5A880]/30"
              />
              <span className="text-xs text-[#EAE6DF]">
                <strong>Realtime Audio Alerts:</strong> Chime on incoming KOT tickets in Kitchen and Waiter terminals.
              </span>
            </label>
          </div>
        </div>

        {/* ── Section 18: Dine-In Verification & Fraud Prevention Architecture ── */}
        <div className="p-6 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/20 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#C5A880]/15">
            <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                Dine-In Order Fraud Prevention & Verification Policies
              </h2>
              <span className="text-[11px] text-[#EAE6DF]/50">
                Rule-based remote order protection: QR Possession ≠ Physical Restaurant Presence
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Max Unverified Order Amount (₹)</label>
              <input
                type="number"
                value={1500}
                readOnly
                className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none"
              />
              <span className="text-[10px] text-[#EAE6DF]/40 mt-0.5 block">Orders above this require server check</span>
            </div>
            <div>
              <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Table Session Timeout (Mins)</label>
              <input
                type="number"
                value={120}
                readOnly
                className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none"
              />
              <span className="text-[10px] text-[#EAE6DF]/40 mt-0.5 block">QR sessions expire after 2 hours inactivity</span>
            </div>
            <div>
              <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Max Active Orders Per Table</label>
              <input
                type="number"
                value={3}
                readOnly
                className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none"
              />
              <span className="text-[10px] text-[#EAE6DF]/40 mt-0.5 block">Prevents unverified order spam</span>
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={true}
                className="w-4 h-4 rounded text-[#C5A880] bg-[#1A1A1A] border-[#C5A880]/30"
              />
              <span className="text-xs text-[#EAE6DF]">
                <strong>Require Server Confirmation for First Order:</strong> Protects against remote QR photo abuse by verifying physical presence before dispatching initial ticket to kitchen.
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={true}
                className="w-4 h-4 rounded text-[#C5A880] bg-[#1A1A1A] border-[#C5A880]/30"
              />
              <span className="text-xs text-[#EAE6DF]">
                <strong>Require Staff Confirmation for High-Value Orders:</strong> Suspicious or large orders (&gt; ₹1,500) trigger automatic verification hold.
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={true}
                className="w-4 h-4 rounded text-[#C5A880] bg-[#1A1A1A] border-[#C5A880]/30"
              />
              <span className="text-xs text-[#EAE6DF]">
                <strong>Enable Rule-Based Risk Engine:</strong> Realtime evaluation of velocity spikes, table state, and order size without external AI dependency.
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={true}
                className="w-4 h-4 rounded text-[#C5A880] bg-[#1A1A1A] border-[#C5A880]/30"
              />
              <span className="text-xs text-[#EAE6DF]">
                <strong>Allow Waiter &amp; Reception Override:</strong> Authorized staff can verify or reject table presence directly from handheld POS and Concierge terminals.
              </span>
            </label>
          </div>
        </div>

        {/* Section 21: Kitchen → Waiter → Table Serving Workflow Configuration */}
        <div className="p-6 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/20 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#C5A880]/15">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                Food Serving &amp; Table Handover Governance
              </h2>
              <span className="text-[11px] text-[#EAE6DF]/50">
                Post-kitchen lifecycle: Ready → Waiter Pickup → Table Verification → Served
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Ready Pickup Delay Alert (Mins)</label>
              <input
                type="number"
                defaultValue={5}
                className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
              />
              <span className="text-[10px] text-[#EAE6DF]/40 mt-0.5 block">Alerts staff if food sits on pass &gt; 5 mins</span>
            </div>
            <div>
              <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Wrong Table Protection</label>
              <input
                type="text"
                readOnly
                value="Enforced (Server-Side)"
                className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-emerald-500/30 text-emerald-400 font-semibold focus:outline-none"
              />
              <span className="text-[10px] text-[#EAE6DF]/40 mt-0.5 block">Rejects serving mismatched table IDs</span>
            </div>
            <div>
              <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Lifecycle Time Tracking</label>
              <input
                type="text"
                readOnly
                value="Active (Audit History)"
                className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#C5A880] font-semibold focus:outline-none"
              />
              <span className="text-[10px] text-[#EAE6DF]/40 mt-0.5 block">Logs ready_at, picked_up_at, served_at</span>
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={true}
                className="w-4 h-4 rounded text-[#C5A880] bg-[#1A1A1A] border-[#C5A880]/30"
              />
              <span className="text-xs text-[#EAE6DF]">
                <strong>Realtime Pass Chimes:</strong> Play synthesized audio chime on waiter tablets when chef marks order ready.
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={true}
                className="w-4 h-4 rounded text-[#C5A880] bg-[#1A1A1A] border-[#C5A880]/30"
              />
              <span className="text-xs text-[#EAE6DF]">
                <strong>Optional QR Code Verification at Table:</strong> Waiters can scan table standee before marking served to verify physical destination.
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={true}
                className="w-4 h-4 rounded text-[#C5A880] bg-[#1A1A1A] border-[#C5A880]/30"
              />
              <span className="text-xs text-[#EAE6DF]">
                <strong>Multi-Order Batch Serving:</strong> Group orders by table so waiters can pick up and serve multiple tickets to the same table in 1 tap.
              </span>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs shadow-warm hover:brightness-110 transition-all">
            <Save className="w-4 h-4" />
            Save Configuration Changes
          </button>
        </div>
      </form>
    </div>
  );
}
