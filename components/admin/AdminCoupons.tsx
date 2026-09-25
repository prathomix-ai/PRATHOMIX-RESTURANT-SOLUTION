'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag,
  Plus,
  Percent,
  Calendar,
  CheckCircle2,
  XCircle,
  Copy,
  Edit2,
  Trash2,
  X,
  Sparkles,
  TrendingUp,
  Coins,
} from 'lucide-react';
import { DEFAULT_RESTAURANT_ID, type Coupon } from '@/lib/supabase';

const INITIAL_COUPONS: Coupon[] = [
  {
    id: 'coup-1',
    restaurant_id: DEFAULT_RESTAURANT_ID,
    code: 'PRATHOMIX10',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_amount: 0,
    max_discount_amount: 500,
    valid_from: '2026-01-01',
    valid_until: '2026-12-31',
    usage_limit: 1000,
    times_used: 342,
    is_active: true,
  },
  {
    id: 'coup-2',
    restaurant_id: DEFAULT_RESTAURANT_ID,
    code: 'WELCOME150',
    discount_type: 'flat',
    discount_value: 150,
    min_order_amount: 500,
    valid_from: '2026-01-01',
    valid_until: '2026-12-31',
    usage_limit: 500,
    times_used: 189,
    is_active: true,
  },
  {
    id: 'coup-3',
    restaurant_id: DEFAULT_RESTAURANT_ID,
    code: 'LUXURY20',
    discount_type: 'percentage',
    discount_value: 20,
    min_order_amount: 1500,
    max_discount_amount: 800,
    valid_from: '2026-05-01',
    valid_until: '2026-10-31',
    usage_limit: 300,
    times_used: 112,
    is_active: true,
  },
  {
    id: 'coup-4',
    restaurant_id: DEFAULT_RESTAURANT_ID,
    code: 'FESTIVE500',
    discount_type: 'flat',
    discount_value: 500,
    min_order_amount: 3000,
    valid_from: '2026-09-01',
    valid_until: '2026-10-15',
    usage_limit: 100,
    times_used: 48,
    is_active: false,
  },
];

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form states
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<'percentage' | 'flat'>('percentage');
  const [formValue, setFormValue] = useState(15);
  const [formMinOrder, setFormMinOrder] = useState(500);
  const [formMaxDiscount, setFormMaxDiscount] = useState<number | undefined>(500);
  const [formValidUntil, setFormValidUntil] = useState('2026-12-31');
  const [formLimit, setFormLimit] = useState(500);
  const [formActive, setFormActive] = useState(true);

  // Stats
  const stats = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter((c) => c.is_active).length;
    const totalRedemptions = coupons.reduce((sum, c) => sum + c.times_used, 0);
    return { total, active, totalRedemptions };
  }, [coupons]);

  function copyToClipboard(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function openAddModal() {
    setSelectedCoupon(null);
    setFormCode('');
    setFormType('percentage');
    setFormValue(15);
    setFormMinOrder(500);
    setFormMaxDiscount(500);
    setFormValidUntil('2026-12-31');
    setFormLimit(500);
    setFormActive(true);
    setModalOpen(true);
  }

  function openEditModal(c: Coupon) {
    setSelectedCoupon(c);
    setFormCode(c.code);
    setFormType(c.discount_type);
    setFormValue(c.discount_value);
    setFormMinOrder(c.min_order_amount);
    setFormMaxDiscount(c.max_discount_amount);
    setFormValidUntil(c.valid_until || '2026-12-31');
    setFormLimit(c.usage_limit);
    setFormActive(c.is_active);
    setModalOpen(true);
  }

  function handleSaveCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!formCode.trim()) return;

    if (selectedCoupon) {
      setCoupons((prev) =>
        prev.map((c) =>
          c.id === selectedCoupon.id
            ? {
                ...c,
                code: formCode.toUpperCase().trim(),
                discount_type: formType,
                discount_value: formValue,
                min_order_amount: formMinOrder,
                max_discount_amount: formType === 'percentage' ? formMaxDiscount : undefined,
                valid_until: formValidUntil,
                usage_limit: formLimit,
                is_active: formActive,
              }
            : c
        )
      );
    } else {
      const newCoupon: Coupon = {
        id: `coup-${Date.now()}`,
        restaurant_id: DEFAULT_RESTAURANT_ID,
        code: formCode.toUpperCase().trim(),
        discount_type: formType,
        discount_value: formValue,
        min_order_amount: formMinOrder,
        max_discount_amount: formType === 'percentage' ? formMaxDiscount : undefined,
        valid_from: new Date().toISOString().slice(0, 10),
        valid_until: formValidUntil,
        usage_limit: formLimit,
        times_used: 0,
        is_active: formActive,
      };
      setCoupons((prev) => [newCoupon, ...prev]);
    }
    setModalOpen(false);
  }

  function toggleActive(id: string) {
    setCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: !c.is_active } : c))
    );
  }

  function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this promotional coupon?')) {
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[#EAE6DF] tracking-wide"
            style={{ fontFamily: 'Cinzel, serif' }}>
            Promotions & Coupon Vault
          </h1>
          <p className="text-xs text-[#EAE6DF]/60 mt-1">
            Configure automated discounts, campaign vouchers, minimum order thresholds & redemption limits.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs shadow-warm hover:brightness-110 transition-all self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          Create Promo Code
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#EAE6DF]/60 uppercase tracking-wider font-semibold">Live Campaigns</span>
            <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#EAE6DF] mt-2 font-mono">{stats.active} Active</div>
          <span className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
            {stats.total} total promo vouchers configured
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#EAE6DF]/60 uppercase tracking-wider font-semibold">Total Redemptions</span>
            <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#C5A880] mt-2 font-mono">{stats.totalRedemptions}</div>
          <span className="text-[10px] text-[#C5A880]/80 mt-1 flex items-center gap-1">Total customer checkouts</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#EAE6DF]/60 uppercase tracking-wider font-semibold">Average Savings</span>
            <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#EAE6DF] mt-2 font-mono">14.8%</div>
          <span className="text-[10px] text-[#EAE6DF]/50 mt-1 flex items-center gap-1">Increased average cart size by 26%</span>
        </div>
      </div>

      {/* Coupons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {coupons.map((c) => {
          const isExpired = c.valid_until && new Date(c.valid_until).getTime() < Date.now();
          const usagePct = Math.round((c.times_used / c.usage_limit) * 100);

          return (
            <div
              key={c.id}
              className={`p-5 rounded-2xl bg-[#121212]/90 border transition-all ${
                c.is_active && !isExpired
                  ? 'border-[#C5A880]/30 hover:border-[#C5A880]'
                  : 'border-[#2A2A2A] opacity-60'
              }`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-[#C5A880] tracking-wider px-2.5 py-1 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/30">
                      {c.code}
                    </span>
                    <button
                      onClick={() => copyToClipboard(c.code)}
                      title="Copy Code"
                      className="p-1 rounded-lg text-[#EAE6DF]/50 hover:text-[#C5A880] transition-colors">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {copiedCode === c.code && (
                      <span className="text-[10px] text-emerald-400 font-bold">Copied!</span>
                    )}
                  </div>
                  <div className="text-xl font-bold text-[#EAE6DF] mt-3">
                    {c.discount_type === 'percentage'
                      ? `${c.discount_value}% OFF`
                      : `₹${c.discount_value} FLAT OFF`}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleActive(c.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                      c.is_active
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400'
                    }`}>
                    {c.is_active ? 'ACTIVE' : 'PAUSED'}
                  </button>
                  <button
                    onClick={() => openEditModal(c)}
                    className="p-1.5 rounded-lg text-[#EAE6DF]/60 hover:text-[#C5A880] hover:bg-[#2A2A2A] transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 rounded-lg text-[#EAE6DF]/60 hover:text-red-400 hover:bg-[#2A2A2A] transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Conditions */}
              <div className="mt-4 pt-3 border-t border-[#C5A880]/10 space-y-1.5 text-xs text-[#EAE6DF]/70">
                <div className="flex justify-between">
                  <span>Minimum Cart Value:</span>
                  <span className="font-mono text-[#EAE6DF] font-semibold">₹{c.min_order_amount}</span>
                </div>
                {c.max_discount_amount && (
                  <div className="flex justify-between">
                    <span>Max Discount Cap:</span>
                    <span className="font-mono text-[#EAE6DF] font-semibold">₹{c.max_discount_amount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Valid Until:</span>
                  <span className="text-[#EAE6DF] font-semibold">{c.valid_until || 'No Expiry'}</span>
                </div>
              </div>

              {/* Usage Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-[10px] text-[#EAE6DF]/60 mb-1">
                  <span>
                    Redemptions: {c.times_used} / {c.usage_limit}
                  </span>
                  <span>{usagePct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#2A2A2A] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#C5A880] to-[#8C7355]"
                    style={{ width: `${Math.min(100, usagePct)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create / Edit Coupon */}
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
                  {selectedCoupon ? 'Edit Promo Voucher' : 'Create New Promotional Voucher'}
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-[#EAE6DF]/60 hover:text-[#EAE6DF] hover:bg-[#1A1A1A]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCoupon} className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Promo Code *</label>
                    <input
                      type="text"
                      required
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      placeholder="e.g. LUXURY25"
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] font-mono tracking-wider focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Discount Type</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]">
                      <option value="percentage">Percentage (%) Off</option>
                      <option value="flat">Flat Amount (₹) Off</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">
                      Discount Value ({formType === 'percentage' ? '%' : '₹'}) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formValue}
                      onChange={(e) => setFormValue(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Min Order Amount (₹)</label>
                    <input
                      type="number"
                      value={formMinOrder}
                      onChange={(e) => setFormMinOrder(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                </div>

                {formType === 'percentage' && (
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Max Discount Cap (₹)</label>
                    <input
                      type="number"
                      value={formMaxDiscount || ''}
                      onChange={(e) => setFormMaxDiscount(parseFloat(e.target.value) || undefined)}
                      placeholder="Optional max cap e.g. 500"
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Valid Until Date</label>
                    <input
                      type="date"
                      value={formValidUntil}
                      onChange={(e) => setFormValidUntil(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Total Usage Limit</label>
                    <input
                      type="number"
                      value={formLimit}
                      onChange={(e) => setFormLimit(parseInt(e.target.value) || 100)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="couponActive"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="w-4 h-4 rounded text-[#C5A880] focus:ring-0 bg-[#1A1A1A] border-[#C5A880]/30"
                  />
                  <label htmlFor="couponActive" className="text-[#EAE6DF] font-semibold cursor-pointer">
                    Enable Voucher Immediately (Active)
                  </label>
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
                    Save Voucher
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
