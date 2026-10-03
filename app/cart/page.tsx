'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
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
  ShieldCheck,
  ShieldAlert,
  BellRing,
  AlertTriangle,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import SplitBill from '@/components/SplitBill';
import CompleteYourMeal from '@/components/CompleteYourMeal';
import { useCartStore } from '@/lib/store';
import { getClientSession } from '@/lib/auth';
import { addLocalOrder } from '@/lib/localOrders';

type OrderType = 'dine_in' | 'takeaway' | 'delivery';
type PaymentMethod = 'cash' | 'upi' | 'card';

function CartContent() {
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
  const [liveVerificationStatus, setLiveVerificationStatus] = useState<string>('PENDING_TABLE_VERIFICATION');

  // Live polling for table verification when waiting for server approval
  useEffect(() => {
    if (!confirmedOrder || !confirmedOrder.id) return;
    const isPending =
      confirmedOrder.status === 'pending_verification' ||
      confirmedOrder.verification_status === 'PENDING_TABLE_VERIFICATION' ||
      confirmedOrder.verification_status === 'HOLD';

    if (!isPending) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      // Don't poll if browser tab is backgrounded
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

      try {
        const queryParam = confirmedOrder.id
          ? `id=${encodeURIComponent(confirmedOrder.id)}`
          : `table=${encodeURIComponent(tableNumber)}`;
        const res = await fetch(`/api/orders?${queryParam}`);
        if (!res.ok || !isMounted) return;
        const list = await res.json();
        const current = Array.isArray(list)
          ? list.find((o: any) => o.id === confirmedOrder.id || o.order_number === confirmedOrder.order_number) || list[0]
          : list;

        if (current && isMounted) {
          if (
            current.status === 'placed' ||
            current.status === 'preparing' ||
            current.verification_status === 'CONFIRMED'
          ) {
            setConfirmedOrder(current);
            setLiveVerificationStatus('CONFIRMED');
          } else if (current.status === 'cancelled' || current.verification_status === 'REJECTED') {
            setConfirmedOrder(current);
            setLiveVerificationStatus('REJECTED');
          }
        }
      } catch {}
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [confirmedOrder, tableNumber]);

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
    if (submitting) return;
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

      const storedSessionToken =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('prathomix_session_token') ||
            localStorage.getItem('prathomix_session_token')
          : null;
      const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

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
        session_token: storedSessionToken,
        idempotency_key: idempotencyKey,
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

      // Persist canonical order locally so it's never lost across navigation or refresh
      if (data && data.id) {
        addLocalOrder({
          id: data.id,
          table_number: data.table_number || (orderType === 'dine_in' ? Number(tableNumber) : null),
          dish_ids: items.map((i) => i.id),
          dish_names: items.map((i) => `${i.qty}x ${i.name}`),
          total_amount: grandTotal,
          split_count: 1,
          status: data.status || 'placed',
          created_at: data.created_at || new Date().toISOString(),
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('prathomix_last_order_id', data.id);
          sessionStorage.setItem('prathomix_last_order_id', data.id);
        }
      }

      setConfirmedOrder(data);
      setLiveVerificationStatus(data.verification_status || 'CONFIRMED');
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
    const isDineIn = orderType === 'dine_in';

    const isAwaitingVerification =
      !isDineIn && (
        liveVerificationStatus === 'PENDING_TABLE_VERIFICATION' ||
        liveVerificationStatus === 'HOLD' ||
        confirmedOrder.status === 'pending_verification'
      );

    const isRejected = liveVerificationStatus === 'REJECTED' || confirmedOrder.status === 'cancelled';

    // ── DINE-IN: No forced payment — show "Continue Ordering" and "View Bill" ──
    if (isDineIn && !isRejected) {
      const sessionToken =
        confirmedOrder.session_id ||
        (typeof window !== 'undefined'
          ? sessionStorage.getItem('prathomix_session_token') || localStorage.getItem('prathomix_session_token')
          : null);
      const billUrl = sessionToken
        ? `/bill?session_token=${encodeURIComponent(sessionToken)}&table=${tableNumber}`
        : `/bill?table=${tableNumber}`;

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
                Order Sent to Kitchen
              </p>
              <h2 className="font-display text-3xl font-bold text-[#EAE6DF] mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
                Enjoy Your Dining!
              </h2>
              <p className="text-xs text-[#EAE6DF]/60 mb-6 leading-relaxed">
                Your order is being prepared. You can order more dishes anytime — everything will appear on your running bill. Pay at the end of your meal.
              </p>

              <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 mb-6 text-left space-y-2">
                <div className="flex justify-between text-xs text-[#EAE6DF]/70">
                  <span>Order Ref:</span>
                  <span className="font-mono text-[#C5A880] font-bold">
                    {confirmedOrder.order_number || `#${String(confirmedOrder.id).slice(0, 8).toUpperCase()}`}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-[#EAE6DF]/70">
                  <span>Table:</span>
                  <span className="text-[#EAE6DF] font-bold">Table {tableNumber}</span>
                </div>
                <div className="flex justify-between text-xs text-[#EAE6DF]/70 border-t border-[#C5A880]/10 pt-2 mt-2">
                  <span>This Order:</span>
                  <span className="text-[#C5A880] font-bold text-sm">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href={`/order?id=${confirmedOrder.id}`}
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider px-5 py-3.5 rounded-xl shadow-warm hover:brightness-110 transition-all">
                  Track Order Live <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href={billUrl}
                  className="inline-flex items-center justify-center gap-2 bg-[#121212] border border-[#C5A880]/30 hover:border-[#C5A880] text-[#C5A880] font-bold text-xs uppercase tracking-wider px-5 py-3.5 rounded-xl transition-all">
                  <Receipt className="w-4 h-4" /> View Running Bill
                </Link>
                <Link
                  href="/menu"
                  className="inline-flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-white/20 text-[#EAE6DF] text-xs font-semibold uppercase tracking-wider px-4 py-3.5 rounded-xl transition-all">
                  Order More
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
        <main className="min-h-screen pt-28 pb-16 flex items-center justify-center px-4 bg-[#0A0A0A] relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C5A880]/10 rounded-full blur-[140px] pointer-events-none" />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-dark rounded-3xl p-8 sm:p-12 text-center max-w-lg border border-[#C5A880]/20 shadow-2xl relative z-10">
            {isRejected ? (
              <>
                <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-6 shadow-warm">
                  <AlertTriangle className="w-10 h-10 text-rose-400" />
                </div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-rose-400 font-bold mb-2">
                  Order Not Confirmed
                </p>
                <h2 className="font-display text-2xl font-bold text-[#EAE6DF] mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
                  Please Speak to Your Server
                </h2>
                <p className="text-xs text-[#EAE6DF]/70 mb-6">
                  This order could not be verified. A server will assist you shortly.
                </p>
              </>
            ) : isAwaitingVerification ? (
              <>
                <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 shadow-warm">
                  <BellRing className="w-10 h-10 text-amber-400 animate-pulse" />
                </div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-amber-400 font-bold mb-2">
                  Awaiting Table Confirmation
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#EAE6DF] mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
                  Order Received
                </h2>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium mb-5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                  Confirming your order…
                </div>
                <p className="text-xs text-[#EAE6DF]/70 mb-6 leading-relaxed">
                  Your order will be processed shortly.
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-[#C5A880]/10 border border-[#C5A880]/30 flex items-center justify-center mx-auto mb-6 shadow-warm">
                  <CheckCircle2 className="w-10 h-10 text-[#C5A880]" />
                </div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#C5A880] font-bold mb-2">
                  Order Confirmed
                </p>
                <h2 className="font-display text-3xl font-bold text-[#EAE6DF] mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
                  {orderType === 'takeaway' ? 'Pickup Soon!' : 'On Its Way!'}
                </h2>
                <p className="text-xs text-[#EAE6DF]/70 mb-6">
                  {orderType === 'takeaway'
                    ? 'Your takeaway order is being prepared. Please collect from the counter.'
                    : 'Your delivery order has been placed. Our team will contact you shortly.'}
                </p>
              </>
            )}

            <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 mb-6 text-left space-y-2">
              <div className="flex justify-between text-xs text-[#EAE6DF]/70">
                <span>Order Ref:</span>
                <span className="font-mono text-[#C5A880] font-bold">
                  {confirmedOrder.order_number || `#${String(confirmedOrder.id).slice(0, 8)}`}
                </span>
              </div>
              <div className="flex justify-between text-xs text-[#EAE6DF]/70">
                <span>Service:</span>
                <span className="capitalize text-[#EAE6DF] font-semibold">{orderType.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-xs text-[#EAE6DF]/70 border-t border-[#C5A880]/10 pt-2 mt-2">
                <span>Total:</span>
                <span className="text-[#C5A880] font-bold text-sm">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/order?id=${confirmedOrder.id}`}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-warm hover:brightness-110 transition-all">
                Track Order Live <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={`/bill?order_id=${confirmedOrder.id}`}
                className="inline-flex items-center justify-center gap-2 bg-[#121212] border border-[#C5A880]/30 hover:border-[#C5A880] text-[#C5A880] font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all">
                <Receipt className="w-4 h-4" /> View Bill
              </Link>
              <Link
                href="/menu"
                className="inline-flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-white/20 text-[#EAE6DF] text-xs font-semibold uppercase tracking-wider px-4 py-3.5 rounded-xl transition-all">
                Browse Menu
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
      <main className="min-h-screen pt-24 sm:pt-28 pb-20 px-3 sm:px-6 max-w-6xl mx-auto bg-[#0A0A0A] text-[#EAE6DF] pb-safe">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-[#C5A880]" />
          </div>
          <div>
            <h1
              className="font-display text-2xl sm:text-3xl font-bold tracking-wide text-[#EAE6DF]"
              style={{ fontFamily: 'Cinzel, serif' }}>
              Your Dining Cart
            </h1>
            <p className="text-xs text-[#EAE6DF]/60 mt-0.5">
              {items.length} item{items.length !== 1 ? 's' : ''} in your order
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 sm:py-28 glass-dark rounded-3xl border border-[#C5A880]/15 p-4">
            <ShoppingCart className="w-14 h-14 sm:w-16 sm:h-16 text-[#C5A880]/30 mx-auto mb-4" />
            <h3 className="font-display text-lg sm:text-xl font-bold text-[#EAE6DF] mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
              Your cart is empty
            </h3>
            <p className="text-xs text-[#EAE6DF]/60 mb-6 max-w-sm mx-auto">
              Explore our chef-curated tasting menu featuring high-protein, calorie-conscious, and artisanal creations.
            </p>
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider px-6 py-3 min-h-[44px] rounded-xl shadow-warm hover:brightness-110 transition-all">
              Explore Menu <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left Items Column */}
            <div className="lg:col-span-7 space-y-4">
              {/* Order Mode Switcher */}
              <div className="glass-dark rounded-2xl border border-[#C5A880]/20 p-1 sm:p-2 grid grid-cols-3 gap-1 sm:gap-2">
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
                    className={`py-2.5 px-1 sm:py-3 sm:px-2 rounded-xl text-[10px] sm:text-xs font-semibold tracking-tight sm:tracking-wider leading-tight transition-all duration-300 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-h-[44px] ${
                      orderType === channel.id
                        ? 'bg-[#C5A880] text-[#0A0A0A] shadow-md font-bold'
                        : 'text-[#EAE6DF]/70 hover:text-[#EAE6DF] hover:bg-[#121212]'
                    }`}>
                    <channel.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="text-center">{channel.label}</span>
                  </button>
                ))}
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <AnimatePresence>
                  {items.map((item) => {
                    const itemSubtotal = item.price * item.qty;
                    const modifierBadge =
                      item.protein >= 30
                        ? 'High Protein (30g+)'
                        : item.calories < 300
                          ? 'Low Calorie (<300 cal)'
                          : 'Artisanal Preparation';

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="glass-dark border border-[#C5A880]/15 hover:border-[#C5A880]/30 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center transition-all">
                        
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Product Image */}
                          <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden flex-shrink-0 border border-[#C5A880]/15 bg-[#121212]">
                            <Image
                              src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'}
                              alt={item.name}
                              width={72}
                              height={72}
                              className="object-cover w-full h-full"
                            />
                          </div>

                          {/* Product Name & Modifiers */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm sm:text-base text-[#EAE6DF] truncate">{item.name}</h4>
                            <p className="text-[10px] text-[#C5A880] font-semibold tracking-wide uppercase mt-0.5">
                              {modifierBadge}
                            </p>
                            
                            {/* Unit Price & Formula Breakdown: ₹280 × 2 = ₹560 */}
                            <p className="text-xs text-[#EAE6DF]/70 mt-1 font-mono">
                              ₹{item.price} × {item.qty} ={' '}
                              <span className="text-[#C5A880] font-bold font-sans text-sm">
                                ₹{itemSubtotal.toFixed(2)}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Controls & Subtotal Row (Mobile: flex row, Desktop: side-by-side) */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#C5A880]/10 flex-shrink-0">
                          {/* Quantity Controls */}
                          <div className="inline-flex items-center bg-[#121212] border border-[#C5A880]/30 rounded-full p-0.5 shadow-sm">
                            <button
                              type="button"
                              onClick={() => updateQty(item.id, item.qty - 1)}
                              aria-label={`Decrease quantity of ${item.name}`}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[#C5A880] hover:bg-[#C5A880] hover:text-[#0A0A0A] transition-colors active:scale-90">
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs sm:text-sm font-bold w-7 text-center text-[#EAE6DF] select-none">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(item.id, item.qty + 1)}
                              aria-label={`Increase quantity of ${item.name}`}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[#C5A880] hover:bg-[#C5A880] hover:text-[#0A0A0A] transition-colors active:scale-90">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[#C5A880] font-bold text-sm sm:text-base hidden sm:inline-block">
                              ₹{itemSubtotal.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="text-[#EAE6DF]/40 hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-rose-500/10"
                              title="Remove item"
                              aria-label={`Remove ${item.name} from cart`}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
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

              {/* Complete Your Meal Recommendations */}
              <div className="glass-dark rounded-2xl border border-[#C5A880]/15 p-4">
                <CompleteYourMeal />
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

                {/* Payment Method Selector — only for delivery/takeaway */}
                {orderType !== 'dine_in' && (
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
                )}

                {/* Dine-in: pay at end of meal notice */}
                {orderType === 'dine_in' && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-[#C5A880]/6 border border-[#C5A880]/15">
                    <Receipt className="w-3.5 h-3.5 text-[#C5A880] flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#EAE6DF]/60 leading-relaxed">
                      Dine-In orders are added to your <span className="text-[#C5A880] font-semibold">running bill</span>. Payment happens when you're ready to leave.
                    </p>
                  </div>
                )}

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
                      <Loader2 className="w-4 h-4 animate-spin text-[#0A0A0A]" /> Placing Order...
                    </>
                  ) : orderType === 'dine_in' ? (
                    <>
                      Place Order <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Confirm &amp; Pay <ArrowRight className="w-4 h-4" />
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

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-[#C5A880]/30 border-t-[#C5A880] rounded-full animate-spin" />
        </div>
      }>
      <CartContent />
    </Suspense>
  );
}
