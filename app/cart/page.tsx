'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Receipt,
  ArrowRight,
  Utensils,
  ShoppingBag,
  Bike,
  Tag,
  CheckCircle2,
  Loader2,
  Clock,
  Sparkles,
  CreditCard,
  Banknote,
  Smartphone,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import SplitBill from '@/components/SplitBill';
import { useCartStore } from '@/lib/store';
import { getClientSession } from '@/lib/auth';

type OrderType = 'dine_in' | 'takeaway' | 'delivery';
type PaymentMethod = 'cash' | 'upi' | 'card';

export default function CartPage() {
  const searchParams = useSearchParams();
  const urlTable = searchParams.get('table');

  const { items, removeItem, updateQty, total, clearCart } = useCartStore();

  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [tableNumber, setTableNumber] = useState(urlTable || '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState('');

  // UI states
  const [showSplit, setShowSplit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<any>(null);

  // Auto-fill from authenticated user profile if logged in
  useEffect(() => {
    const user = getClientSession();
    if (user) {
      if (user.name) setCustomerName(user.name);
      if (user.phone) setCustomerPhone(user.phone);
    }
    if (urlTable) {
      setTableNumber(urlTable);
      setOrderType('dine_in');
    }
  }, [urlTable]);

  const rawSubtotal = total();
  const tax = rawSubtotal * 0.05; // 5% GST
  const deliveryFee = orderType === 'delivery' ? 40 : 0;

  // Calculate discount
  let discount = 0;
  if (appliedCoupon) {
    discount = appliedCoupon.discount;
  }

  const grandTotal = Math.max(0, rawSubtotal + tax + deliveryFee - discount);

  function handleApplyCoupon() {
    setCouponError('');
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    if (code === 'PRATHOMIX10') {
      const disc = Math.min(200, rawSubtotal * 0.1);
      setAppliedCoupon({ code, discount: disc });
    } else if (code === 'WELCOME150') {
      if (rawSubtotal < 500) {
        setCouponError('Minimum order of ₹500 required for WELCOME150');
        return;
      }
      setAppliedCoupon({ code, discount: 150 });
    } else if (code === 'LUXURY20') {
      if (rawSubtotal < 1000) {
        setCouponError('Minimum order of ₹1000 required for LUXURY20');
        return;
      }
      const disc = Math.min(400, rawSubtotal * 0.2);
      setAppliedCoupon({ code, discount: disc });
    } else {
      setCouponError('Invalid or expired promotional code.');
    }
  }

  async function handlePlaceOrder() {
    setOrderError('');

    if (items.length === 0) {
      setOrderError('Your cart is empty. Add dishes before checkout.');
      return;
    }

    if (orderType === 'dine_in' && (!tableNumber.trim() || Number(tableNumber) < 1)) {
      setOrderError('Please enter your table number for Dine-In.');
      return;
    }

    if (orderType === 'delivery') {
      if (!deliveryAddress.trim()) {
        setOrderError('Please provide your complete delivery address.');
        return;
      }
      if (!customerPhone.trim()) {
        setOrderError('Please provide a phone number for delivery contact.');
        return;
      }
    }

    if (orderType === 'takeaway' && !customerName.trim()) {
      setOrderError('Please provide a name for takeaway pickup.');
      return;
    }

    setSubmitting(true);

    try {
      const itemsDetail = items.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        qty: i.qty,
      }));

      const payload = {
        order_type: orderType,
        table_number: orderType === 'dine_in' ? Number(tableNumber) : null,
        customer_name: customerName.trim() || 'Guest',
        customer_phone: customerPhone.trim(),
        delivery_address: orderType === 'delivery' ? deliveryAddress.trim() : null,
        dish_ids: items.map((i) => i.id),
        dish_names: items.map((i) => `${i.qty}x ${i.name}`),
        items_detail: itemsDetail,
        total_amount: grandTotal,
        subtotal: rawSubtotal,
        tax_amount: tax,
        delivery_fee: deliveryFee,
        discount_amount: discount,
        coupon_code: appliedCoupon?.code || null,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'cash' ? 'pending' : 'paid',
        notes: orderNotes.trim(),
        split_count: 1,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Unable to place order. Please try again.');
      }

      // Trigger mock WhatsApp confirmation
      fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'order',
          amount: grandTotal,
          dishes: items.map((i) => `${i.qty}x ${i.name}`),
          orderType,
        }),
      }).catch(() => null);

      setConfirmedOrder(data);
      clearCart();
    } catch (err: any) {
      console.error('Order placement error:', err);
      setOrderError(err?.message || 'Order submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success State ──────────────────────────────────────────────────────────
  if (confirmedOrder) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-28 pb-16 flex items-center justify-center px-4 bg-[#0A0A0A] relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C5A880]/10 rounded-full blur-[140px] pointer-events-none" />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-dark rounded-3xl p-8 sm:p-12 text-center max-w-lg border border-[#C5A880]/20 shadow-2xl relative z-10">
            <div className="w-20 h-20 rounded-full bg-[#C5A880]/10 border border-[#C5A880]/30 flex items-center justify-center mx-auto mb-6 shadow-warm">
              <CheckCircle2 className="w-10 h-10 text-[#C5A880]" />
            </div>

            <p className="text-[10px] uppercase tracking-[0.3em] text-[#C5A880] font-bold mb-2">
              Order Confirmed
            </p>
            <h2
              className="font-display text-3xl font-bold text-[#EAE6DF] mb-3"
              style={{ fontFamily: 'Cinzel, serif' }}>
              Sent to Kitchen
            </h2>

            <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 mb-6 text-left space-y-2">
              <div className="flex justify-between text-xs text-[#EAE6DF]/70">
                <span>Order Ref:</span>
                <span className="font-mono text-[#C5A880] font-bold">
                  {confirmedOrder.order_number || `#${String(confirmedOrder.id).slice(0, 8)}`}
                </span>
              </div>
              <div className="flex justify-between text-xs text-[#EAE6DF]/70">
                <span>Service Channel:</span>
                <span className="capitalize text-[#EAE6DF] font-semibold">{orderType.replace('_', ' ')}</span>
              </div>
              {orderType === 'dine_in' && (
                <div className="flex justify-between text-xs text-[#EAE6DF]/70">
                  <span>Table Number:</span>
                  <span className="text-[#EAE6DF] font-bold">Table {tableNumber}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-[#EAE6DF]/70 border-t border-[#C5A880]/10 pt-2 mt-2">
                <span>Total Amount:</span>
                <span className="text-[#C5A880] font-bold text-sm">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-xs text-[#EAE6DF]/70 mb-6">
              Our culinary team is preparing your gourmet order. Real-time status updates are live on the kitchen display.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/menu"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-warm hover:brightness-110 transition-all">
                Browse More Dishes <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-28 pb-20 px-4 max-w-6xl mx-auto bg-[#0A0A0A] text-[#EAE6DF]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-[#C5A880]" />
          </div>
          <div>
            <h1
              className="font-display text-3xl font-bold tracking-wide text-[#EAE6DF]"
              style={{ fontFamily: 'Cinzel, serif' }}>
              Your Dining Cart
            </h1>
            <p className="text-xs text-[#EAE6DF]/60 mt-0.5">
              {items.length} item{items.length !== 1 ? 's' : ''} in your order
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-28 glass-dark rounded-3xl border border-[#C5A880]/15">
            <ShoppingCart className="w-16 h-16 text-[#C5A880]/30 mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold text-[#EAE6DF] mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
              Your cart is empty
            </h3>
            <p className="text-xs text-[#EAE6DF]/60 mb-6 max-w-sm mx-auto">
              Explore our chef-curated tasting menu featuring high-protein, calorie-conscious, and artisanal creations.
            </p>
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl shadow-warm hover:brightness-110 transition-all">
              Explore Menu <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left Items Column */}
            <div className="lg:col-span-7 space-y-4">
              {/* Order Mode Switcher */}
              <div className="glass-dark rounded-2xl border border-[#C5A880]/20 p-2 grid grid-cols-3 gap-2">
                {[
                  { id: 'dine_in', label: 'Dine-In', icon: Utensils },
                  { id: 'takeaway', label: 'Takeaway', icon: ShoppingBag },
                  { id: 'delivery', label: 'Direct Delivery', icon: Bike },
                ].map((channel) => (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => {
                      setOrderType(channel.id as OrderType);
                      setOrderError('');
                    }}
                    className={`py-3 px-2 rounded-xl text-xs font-semibold tracking-wider transition-all duration-300 flex flex-col sm:flex-row items-center justify-center gap-2 ${
                      orderType === channel.id
                        ? 'bg-[#C5A880] text-[#0A0A0A] shadow-md font-bold'
                        : 'text-[#EAE6DF]/70 hover:text-[#EAE6DF] hover:bg-[#121212]'
                    }`}>
                    <channel.icon className="w-4 h-4" />
                    <span>{channel.label}</span>
                  </button>
                ))}
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <AnimatePresence>
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="glass-dark border border-[#C5A880]/15 hover:border-[#C5A880]/30 rounded-2xl p-4 flex gap-4 items-center transition-all">
                      <div className="relative w-18 h-18 rounded-xl overflow-hidden flex-shrink-0 border border-[#C5A880]/10">
                        <Image
                          src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'}
                          alt={item.name}
                          width={72}
                          height={72}
                          className="object-cover w-full h-full"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-[#EAE6DF] truncate">{item.name}</h4>
                        <p className="text-xs text-[#C5A880] mt-0.5 font-medium">₹{item.price} each</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => updateQty(item.id, item.qty - 1)}
                            className="w-7 h-7 rounded-lg bg-[#121212] border border-[#C5A880]/20 hover:border-[#C5A880] flex items-center justify-center text-[#EAE6DF] transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-bold w-6 text-center text-[#EAE6DF]">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.id, item.qty + 1)}
                            className="w-7 h-7 rounded-lg bg-[#121212] border border-[#C5A880]/20 hover:border-[#C5A880] flex items-center justify-center text-[#EAE6DF] transition-colors">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 flex-shrink-0">
                        <span className="text-[#C5A880] font-bold text-base">
                          ₹{(item.price * item.qty).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-[#EAE6DF]/40 hover:text-rose-400 transition-colors p-1"
                          title="Remove item">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Special Instructions */}
              <div className="glass-dark rounded-2xl border border-[#C5A880]/15 p-4">
                <label className="text-[11px] font-semibold text-[#EAE6DF]/70 uppercase tracking-wider mb-2 block">
                  Kitchen Notes & Dietary Requests
                </label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Less spicy, dressing on the side, allergic to peanuts..."
                  className="w-full bg-[#121212] border border-[#C5A880]/20 focus:border-[#C5A880] rounded-xl px-4 py-2.5 text-xs text-[#EAE6DF] placeholder-[#EAE6DF]/30 outline-none"
                />
              </div>
            </div>

            {/* Right Summary Sidebar */}
            <div className="lg:col-span-5 space-y-4">
              <div className="glass-dark rounded-3xl p-6 border border-[#C5A880]/20 shadow-2xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#C5A880]/15">
                  <h3
                    className="font-display text-lg font-bold text-[#EAE6DF] flex items-center gap-2"
                    style={{ fontFamily: 'Cinzel, serif' }}>
                    <Receipt className="w-5 h-5 text-[#C5A880]" /> Order Summary
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#C5A880] bg-[#C5A880]/10 px-2.5 py-1 rounded-full border border-[#C5A880]/20">
                    {orderType.replace('_', ' ')}
                  </span>
                </div>

                {/* Conditional Channel Details */}
                {orderType === 'dine_in' && (
                  <div>
                    <label className="text-[11px] font-semibold text-[#EAE6DF]/80 uppercase tracking-wider mb-1.5 block">
                      Table Number *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={tableNumber}
                      onChange={(e) => {
                        setTableNumber(e.target.value);
                        setOrderError('');
                      }}
                      placeholder="e.g. 4"
                      className="w-full bg-[#121212] border border-[#C5A880]/25 focus:border-[#C5A880] rounded-xl px-4 py-2.5 text-sm text-[#EAE6DF] font-semibold outline-none"
                    />
                    {urlTable && (
                      <p className="text-[10px] text-[#C5A880] mt-1">
                        Table {urlTable} identified automatically from QR code.
                      </p>
                    )}
                  </div>
                )}

                {orderType === 'delivery' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#EAE6DF]/80 uppercase tracking-wider mb-1 block">
                        Full Name & Phone *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Your Name"
                          className="bg-[#121212] border border-[#C5A880]/20 rounded-xl px-3 py-2 text-xs text-[#EAE6DF] outline-none"
                        />
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="Phone number"
                          className="bg-[#121212] border border-[#C5A880]/20 rounded-xl px-3 py-2 text-xs text-[#EAE6DF] outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#EAE6DF]/80 uppercase tracking-wider mb-1 block">
                        Delivery Address *
                      </label>
                      <textarea
                        rows={2}
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Apartment/Flat, Street name, Landmark, City"
                        className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl px-3 py-2 text-xs text-[#EAE6DF] outline-none resize-none"
                      />
                    </div>
                  </div>
                )}

                {orderType === 'takeaway' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-[#EAE6DF]/80 uppercase tracking-wider mb-1 block">
                        Pickup Name *
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Your Name"
                        className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl px-3 py-2 text-xs text-[#EAE6DF] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#EAE6DF]/80 uppercase tracking-wider mb-1 block">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Phone"
                        className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl px-3 py-2 text-xs text-[#EAE6DF] outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Coupon Box */}
                <div>
                  <label className="text-[11px] font-semibold text-[#EAE6DF]/80 uppercase tracking-wider mb-1.5 block">
                    Promo Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="e.g. PRATHOMIX10"
                      className="flex-1 bg-[#121212] border border-[#C5A880]/20 focus:border-[#C5A880] rounded-xl px-3 py-2 text-xs font-mono uppercase text-[#EAE6DF] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-4 py-2 rounded-xl bg-[#C5A880]/15 hover:bg-[#C5A880] hover:text-[#0A0A0A] text-[#C5A880] text-xs font-bold border border-[#C5A880]/30 transition-all">
                      Apply
                    </button>
                  </div>
                  {appliedCoupon && (
                    <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Coupon &apos;{appliedCoupon.code}&apos; applied (-₹{discount.toFixed(2)})
                    </p>
                  )}
                  {couponError && <p className="text-[11px] text-rose-400 mt-1">{couponError}</p>}
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="text-[11px] font-semibold text-[#EAE6DF]/80 uppercase tracking-wider mb-1.5 block">
                    Payment Option
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'upi', label: 'UPI / QR', icon: Smartphone },
                      { id: 'card', label: 'Card', icon: CreditCard },
                      { id: 'cash', label: 'Cash', icon: Banknote },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPaymentMethod(opt.id as PaymentMethod)}
                        className={`py-2 px-1 rounded-xl text-[11px] font-medium border transition-all flex flex-col items-center justify-center gap-1 ${
                          paymentMethod === opt.id
                            ? 'bg-[#C5A880]/15 border-[#C5A880] text-[#C5A880]'
                            : 'bg-[#121212] border-[#C5A880]/15 text-[#EAE6DF]/60 hover:text-[#EAE6DF]'
                        }`}>
                        <opt.icon className="w-3.5 h-3.5" />
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2 pt-2 border-t border-[#C5A880]/15 text-xs text-[#EAE6DF]/70">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-[#EAE6DF] font-medium">₹{rawSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (5%)</span>
                    <span className="text-[#EAE6DF] font-medium">₹{tax.toFixed(2)}</span>
                  </div>
                  {orderType === 'delivery' && (
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span className="text-[#EAE6DF] font-medium">₹{deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>Promotion Discount</span>
                      <span>-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-[#EAE6DF] border-t border-[#C5A880]/15 pt-3 mt-2 text-base">
                    <span>Grand Total</span>
                    <span className="text-[#C5A880] text-lg font-display" style={{ fontFamily: 'Cinzel, serif' }}>
                      ₹{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {orderError && (
                  <p className="text-xs text-rose-400 text-center bg-rose-500/10 border border-rose-500/20 py-2 px-3 rounded-xl">
                    {orderError}
                  </p>
                )}

                {/* Submit button with double-click protection */}
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={submitting}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-sm uppercase tracking-wider shadow-warm hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#0A0A0A]" /> Submitting Order...
                    </>
                  ) : (
                    <>
                      Confirm & Send Order <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Split Bill Trigger */}
                {orderType === 'dine_in' && (
                  <button
                    type="button"
                    onClick={() => setShowSplit(!showSplit)}
                    className="w-full py-2.5 rounded-xl bg-[#121212] border border-[#C5A880]/20 hover:border-[#C5A880] text-[#EAE6DF]/70 hover:text-[#C5A880] text-xs font-semibold transition-all">
                    {showSplit ? '▲ Close Split Bill' : '👥 Split Bill Among Table Guests'}
                  </button>
                )}
              </div>

              {/* Split Bill Modal/Container */}
              <AnimatePresence>
                {showSplit && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}>
                    <SplitBill total={grandTotal} onConfirm={handlePlaceOrder} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
