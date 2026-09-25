'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartHandshake,
  Crown,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Award,
  Sparkles,
  Edit2,
  Trash2,
  X,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import { supabase, DEFAULT_RESTAURANT_ID, type CustomerRecord } from '@/lib/supabase';

const INITIAL_CUSTOMERS: CustomerRecord[] = [
  {
    id: 'cust-1',
    restaurant_id: DEFAULT_RESTAURANT_ID,
    name: 'Vikramaditya Roy',
    phone: '+91 98201 99881',
    email: 'v.roy@luxuryholdings.com',
    total_orders: 28,
    total_spent: 142500,
    last_order_date: '2026-09-24',
    loyalty_tier: 'vip',
    dietary_notes: 'Prefers Table 10 (VIP Lounge). Fond of Dom Pérignon & Truffle dishes. Pescatarian.',
  },
  {
    id: 'cust-2',
    restaurant_id: DEFAULT_RESTAURANT_ID,
    name: 'Ananya Deshmukh',
    phone: '+91 98111 88772',
    email: 'ananya.d@artgallery.in',
    total_orders: 14,
    total_spent: 48900,
    last_order_date: '2026-09-22',
    loyalty_tier: 'vip',
    dietary_notes: 'Lactose intolerant. Prefers Terrace Garden corner tables.',
  },
  {
    id: 'cust-3',
    restaurant_id: DEFAULT_RESTAURANT_ID,
    name: 'Rohan Mehra',
    phone: '+91 98450 77663',
    email: 'rohan.mehra@techventures.io',
    total_orders: 9,
    total_spent: 24300,
    last_order_date: '2026-09-18',
    loyalty_tier: 'regular',
    dietary_notes: 'High protein focus. Always orders Salmon Teriyaki & Protein Shakes.',
  },
  {
    id: 'cust-4',
    restaurant_id: DEFAULT_RESTAURANT_ID,
    name: 'Dr. Siddharth Rao',
    phone: '+91 97722 55441',
    email: 'siddharth.rao@apollo.org',
    total_orders: 6,
    total_spent: 18200,
    last_order_date: '2026-09-14',
    loyalty_tier: 'regular',
    dietary_notes: 'Low sodium, mild spices only.',
  },
  {
    id: 'cust-5',
    restaurant_id: DEFAULT_RESTAURANT_ID,
    name: 'Natasha Kapoor',
    phone: '+91 98333 44110',
    email: 'natasha.k@vogue.in',
    total_orders: 2,
    total_spent: 7600,
    last_order_date: '2026-09-25',
    loyalty_tier: 'new',
    dietary_notes: 'Celebrated anniversary at Table 4. Loves chocolate desserts.',
  },
];

export default function AdminCRM() {
  const [customers, setCustomers] = useState<CustomerRecord[]>(INITIAL_CUSTOMERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('All');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCust, setSelectedCust] = useState<CustomerRecord | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTier, setFormTier] = useState<'new' | 'regular' | 'vip' | 'inactive'>('regular');
  const [formNotes, setFormNotes] = useState('');

  // Filtered
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchQuery =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchTier = selectedTier === 'All' || c.loyalty_tier === selectedTier;
      return matchQuery && matchTier;
    });
  }, [customers, searchQuery, selectedTier]);

  // Stats
  const stats = useMemo(() => {
    const total = customers.length;
    const vipCount = customers.filter((c) => c.loyalty_tier === 'vip').length;
    const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);
    const avgLifetimeValue = total > 0 ? Math.round(totalRevenue / total) : 0;
    return { total, vipCount, totalRevenue, avgLifetimeValue };
  }, [customers]);

  const tiers = ['All', 'vip', 'regular', 'new', 'inactive'];

  function openAddModal() {
    setSelectedCust(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormTier('new');
    setFormNotes('');
    setModalOpen(true);
  }

  function openEditModal(c: CustomerRecord) {
    setSelectedCust(c);
    setFormName(c.name);
    setFormPhone(c.phone);
    setFormEmail(c.email || '');
    setFormTier(c.loyalty_tier);
    setFormNotes(c.dietary_notes || '');
    setModalOpen(true);
  }

  function handleSaveCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    if (selectedCust) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCust.id
            ? {
                ...c,
                name: formName,
                phone: formPhone,
                email: formEmail,
                loyalty_tier: formTier,
                dietary_notes: formNotes,
              }
            : c
        )
      );
    } else {
      const newCust: CustomerRecord = {
        id: `cust-${Date.now()}`,
        restaurant_id: DEFAULT_RESTAURANT_ID,
        name: formName,
        phone: formPhone,
        email: formEmail,
        total_orders: 1,
        total_spent: 0,
        last_order_date: new Date().toISOString().slice(0, 10),
        loyalty_tier: formTier,
        dietary_notes: formNotes,
      };
      setCustomers((prev) => [newCust, ...prev]);
    }
    setModalOpen(false);
  }

  function toggleVIP(id: string) {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, loyalty_tier: c.loyalty_tier === 'vip' ? 'regular' : 'vip' } : c
      )
    );
  }

  function handleDelete(id: string) {
    if (confirm('Are you sure you want to remove this customer record?')) {
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[#EAE6DF] tracking-wide"
            style={{ fontFamily: 'Cinzel, serif' }}>
            Guest Relations & VIP Intelligence
          </h1>
          <p className="text-xs text-[#EAE6DF]/60 mt-1">
            Track dining habits, lifetime guest valuation, dietary requests & VIP hospitality notes.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs shadow-warm hover:brightness-110 transition-all self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          Add Guest Profile
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#EAE6DF]/60 uppercase tracking-wider font-semibold">Total Profiles</span>
            <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#EAE6DF] mt-2 font-mono">{stats.total}</div>
          <span className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">Active customer base</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/30 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#C5A880] uppercase tracking-wider font-semibold">VIP Patrons</span>
            <div className="w-8 h-8 rounded-lg bg-[#C5A880]/15 border border-[#C5A880]/40 flex items-center justify-center text-[#C5A880]">
              <Crown className="w-4 h-4 text-[#C5A880]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#C5A880] mt-2 font-mono">{stats.vipCount}</div>
          <span className="text-[10px] text-[#C5A880]/80 mt-1 flex items-center gap-1">High-spending tier</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#EAE6DF]/60 uppercase tracking-wider font-semibold">Average LTV</span>
            <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#EAE6DF] mt-2 font-mono">
            ₹{stats.avgLifetimeValue.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-[#EAE6DF]/50 mt-1 flex items-center gap-1">Average lifetime spend</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#EAE6DF]/60 uppercase tracking-wider font-semibold">Total CRM Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#C5A880] mt-2 font-mono">
            ₹{stats.totalRevenue.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">Generated from regulars</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C5A880]/60" />
          <input
            type="text"
            placeholder="Search by patron name, phone number or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-xs text-[#EAE6DF] placeholder:text-[#EAE6DF]/40 focus:outline-none focus:border-[#C5A880]"
          />
        </div>

        {/* Tier Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {tiers.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTier(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${
                selectedTier === t
                  ? 'bg-[#C5A880] text-[#0A0A0A]'
                  : 'bg-[#1A1A1A] text-[#EAE6DF]/70 hover:text-[#EAE6DF] border border-[#C5A880]/10'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* CRM Patrons Table */}
      <div className="rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#C5A880]/15 bg-[#181818] text-[#C5A880] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Patron & Tier</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Visits</th>
                <th className="py-3 px-4">Lifetime Spend</th>
                <th className="py-3 px-4">Last Visit</th>
                <th className="py-3 px-4">Hospitality & Dietary Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C5A880]/10">
              {filteredCustomers.map((cust) => {
                const isVip = cust.loyalty_tier === 'vip';

                return (
                  <tr key={cust.id} className="hover:bg-[#1A1A1A]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#EAE6DF] flex items-center gap-1.5">
                        {cust.name}
                        {isVip && <Crown className="w-3.5 h-3.5 text-[#C5A880] fill-[#C5A880]/20" />}
                      </div>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mt-1 border ${
                          isVip
                            ? 'bg-[#C5A880]/20 border-[#C5A880]/40 text-[#C5A880]'
                            : cust.loyalty_tier === 'regular'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400'
                        }`}>
                        {cust.loyalty_tier}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-[#EAE6DF] font-medium">{cust.phone}</div>
                      <div className="text-[10px] text-[#EAE6DF]/50">{cust.email || '—'}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-[#EAE6DF]">
                      {cust.total_orders} orders
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-[#C5A880]">
                      ₹{cust.total_spent.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 text-[#EAE6DF]/70">
                      {cust.last_order_date || '—'}
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="text-[11px] text-[#EAE6DF]/80 italic line-clamp-2">
                        {cust.dietary_notes || 'No specific requests recorded.'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleVIP(cust.id)}
                          title="Toggle VIP status"
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isVip
                              ? 'bg-[#C5A880]/20 border-[#C5A880]/40 text-[#C5A880]'
                              : 'bg-[#1A1A1A] border-[#C5A880]/15 text-[#EAE6DF]/50 hover:text-[#C5A880]'
                          }`}>
                          <Crown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(cust)}
                          className="p-1.5 rounded-lg text-[#EAE6DF]/60 hover:text-[#C5A880] hover:bg-[#2A2A2A] transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cust.id)}
                          className="p-1.5 rounded-lg text-[#EAE6DF]/60 hover:text-red-400 hover:bg-[#2A2A2A] transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[#EAE6DF]/50">
                    No guest profiles found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add / Edit Guest Profile */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-[#121212] border border-[#C5A880]/30 shadow-2xl p-6 relative">
              <div className="flex items-center justify-between pb-4 border-b border-[#C5A880]/15">
                <h3
                  className="text-lg font-bold text-[#EAE6DF] tracking-wide"
                  style={{ fontFamily: 'Cinzel, serif' }}>
                  {selectedCust ? 'Edit Guest Profile' : 'Register VIP / Guest Profile'}
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-[#EAE6DF]/60 hover:text-[#EAE6DF] hover:bg-[#1A1A1A]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCustomer} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Guest Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Vikramaditya Roy"
                    className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+91 98..."
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Email Address</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="guest@domain.com"
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Loyalty Tier</label>
                  <select
                    value={formTier}
                    onChange={(e) => setFormTier(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]">
                    <option value="vip">VIP Patron (Highest Priority)</option>
                    <option value="regular">Regular Diner</option>
                    <option value="new">First-Time Guest</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Hospitality & Dietary Preferences</label>
                  <textarea
                    rows={3}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="e.g. Always requests Booth 9, allergic to shellfish, prefers sparkling water."
                    className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[#C5A880]/15">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#1A1A1A] text-[#EAE6DF]/70 hover:bg-[#2A2A2A]">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold shadow-warm hover:brightness-110">
                    Save Profile
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
