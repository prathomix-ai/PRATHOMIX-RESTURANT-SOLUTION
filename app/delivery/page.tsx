'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, MapPin, Navigation, ShoppingCart, Trash2, Plus, Minus, Receipt, ArrowRight, Loader2, Clock, CheckCircle2, Phone, ArrowLeft, Compass, Bike } from 'lucide-react';
import Navbar from '@/components/Navbar';
import DishCard from '@/components/DishCard';
import { useCartStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import type { Dish } from '@/lib/supabase';

const ChatInterface = dynamic(() => import('@/components/ChatInterface'), {
  ssr: false,
  loading: () => null,
});

const CATEGORIES = ['All', 'High Protein', 'Low Cal', 'Vegetarian', 'Main'];
const normalize = (value: string) => value.trim().toLowerCase();

export default function DeliveryPage() {
  const { items, removeItem, updateQty, total, clearCart } = useCartStore();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delivery states
  const [address, setAddress] = useState('Garhwa, Jharkhand, India');
  const [distance, setDistance] = useState<number | null>(4.2);
  const [locating, setLocating] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [placedOrderId, setPlacedOrderId] = useState('');
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutAddress, setCheckoutAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [trackingMode, setTrackingMode] = useState(false);
  const [liveStatus, setLiveStatus] = useState('placed');

  const deferredSearch = useDeferredValue(search);

  // Load Dishes
  useEffect(() => {
    let mounted = true;
    async function loadDishes() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/dishes', { cache: 'no-store' });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.error || 'Failed to fetch dishes');
        const dishList: Dish[] = Array.isArray(payload) ? payload : [];
        if (!mounted) return;
        setDishes(dishList);
      } catch (err: unknown) {
        if (!mounted) return;
        setDishes([]);
        setError(err instanceof Error ? err.message : 'Unable to load menu');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadDishes();
    return () => {
      mounted = false;
    };
  }, []);

  // Filter Dishes
  const filtered = useMemo(() => {
    let next = normalize(category) === 'all'
      ? dishes
      : dishes.filter((d) => normalize(d.category) === normalize(category));

    const query = normalize(deferredSearch);
    if (query) {
      next = next.filter((d) =>
        [d.name, d.description, d.category]
          .filter(Boolean)
          .some((field) => normalize(String(field)).includes(query))
      );
    }
    return next;
  }, [category, deferredSearch, dishes]);

  // GPS Geolocation and Reverse Geocoding
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setOrderError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    setOrderError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Query free reverse-geocoding API (OSM Nominatim)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            {
              headers: {
                'User-Agent': 'PrathomixRestaurantDelivery/1.0',
              },
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            const displayName = data.display_name || '';
            const parts = displayName.split(',');
            // Extract the street/neighborhood/city part (first 3-4 segments) to keep it neat
            const streetAddress = parts.slice(0, 4).join(',').trim();
            
            setAddress(streetAddress || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            
            // Calculate a realistic distance from restaurant based on coordinate hashes
            const dist = parseFloat(((Math.abs(latitude) + Math.abs(longitude)) % 5 + 1.4).toFixed(1));
            setDistance(dist);
          } else {
            throw new Error('Reverse geocoding query failed.');
          }
        } catch (err) {
          // Fallback to coordinates format if geocoding fails
          setAddress(`Sector ${Math.floor(longitude * 100) % 12 + 1}, Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
          const dist = parseFloat(((Math.abs(latitude) + Math.abs(longitude)) % 5 + 1.4).toFixed(1));
          setDistance(dist);
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        console.error('Geolocation lookup failed:', error);
        // Fallback mock address if permission is denied
        setAddress('742 Evergreen Terrace, Sector 5, Tech City (Mocked Location)');
        setDistance(4.8);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // Handle address input manually and calculate dynamic distance
  const handleAddressChange = (val: string) => {
    setAddress(val);
    setOrderError('');
    if (val.trim().length > 6) {
      const dist = parseFloat(((val.trim().length % 6) + 1.6).toFixed(1));
      setDistance(dist);
    } else {
      setDistance(null);
    }
  };

  // Calculations
  const subtotal = total();
  const gst = subtotal * 0.05;
  const deliveryFee = distance ? Math.round(distance * 10 + 20) : 0; // base 20 + 10/km
  const expectedTime = distance ? `${Math.round(distance * 4 + 15)}-${Math.round(distance * 4 + 25)} mins` : null;
  const grandTotal = subtotal > 0 ? subtotal + gst + deliveryFee : 0;

  // Open Sleek Checkout Details Modal
  const openCheckoutDetails = () => {
    if (items.length === 0) {
      setOrderError('Your cart is empty.');
      return;
    }
    setCheckoutAddress(address); // Pre-fill with the geocoded address
    setCheckoutModalOpen(true);
  };

  // Checkout submission
  const handleCheckout = async () => {
    if (!checkoutAddress.trim()) {
      setOrderError('Please enter a complete delivery address.');
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      setOrderError('Please enter a valid 10-digit phone number.');
      return;
    }
    if (items.length === 0) {
      setOrderError('Your cart is empty.');
      return;
    }

    setOrdering(true);
    setOrderError('');

    try {
      const dishIds = items.map((i) => i.id);
      const dishNames = items.map((i) => i.name);
      
      const orderPayload = {
        table_number: 999, // 999 represents Home Delivery
        dish_ids: dishIds,
        dish_names: dishNames,
        total_amount: Number(grandTotal.toFixed(2)),
        split_count: 1,
        status: 'placed',
      };

      const { data, error: insertError } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      if (insertError) throw insertError;

      // Store delivery metadata in localStorage for Rider Dashboard reference
      if (data) {
        const localMeta = JSON.parse(localStorage.getItem('delivery_orders_metadata') || '{}');
        localMeta[data.id] = {
          address: checkoutAddress,
          phone: phone,
          distance,
          fee: deliveryFee,
          expectedTime,
        };
        localStorage.setItem('delivery_orders_metadata', JSON.stringify(localMeta));
        setPlacedOrderId(data.id);
      }

      // WhatsApp API Mock
      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'delivery_order',
          amount: grandTotal,
          dishes: items.map((i) => i.name),
          address: checkoutAddress,
          phone: phone,
        }),
      }).catch((e) => console.log('Mock WhatsApp failed:', e));

      clearCart();
      setCheckoutModalOpen(false);
      setOrdered(true);
    } catch (e) {
      console.error('Delivery checkout error:', e);
      setOrderError('Unable to place delivery order. Please try again.');
    } finally {
      setOrdering(false);
    }
  };

  // Real-time status subscription for the placed order
  useEffect(() => {
    if (!placedOrderId) return;

    // Set initial status to 'placed'
    setLiveStatus('placed');

    // Subscribe to changes for this specific order
    const channel = supabase
      .channel(`order-tracking:${placedOrderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${placedOrderId}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).status) {
            setLiveStatus((payload.new as any).status);
          }
        }
      )
      .subscribe();

    // Poll fallback in case of connection limits/issues
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('status')
          .eq('id', placedOrderId)
          .single();
        if (data && !error) {
          setLiveStatus(data.status);
        }
      } catch (err) {
        console.error('Failed to poll order status:', err);
      }
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [placedOrderId]);

  // Success view
  if (ordered && !trackingMode) {
    return (
      <div className="min-h-screen text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1 pt-32 pb-16 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-3xl mx-auto glass border border-warm-200 rounded-[2rem] p-8 sm:p-10 shadow-warm-lg text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C5A880] to-[#EAE6DF]" />
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-[#1D3B24]" />
            </div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#1D3B24] font-semibold mb-3">Order Confirmed</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary-900 mb-4" style={{ fontFamily: 'Cinzel, serif' }}>
              Delivery Placed!
            </h1>
            <p className="text-gray-600 max-w-xl mx-auto leading-relaxed mb-8">
              Your order is in the kitchen queue. A delivery rider will pick it up soon.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <div className="rounded-2xl bg-white/35 backdrop-blur-md border border-white/40 p-4 text-left shadow-warm">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Order ID</p>
                <p className="text-xs font-semibold text-gray-900 font-mono">#{placedOrderId.slice(0, 8).toUpperCase()}...</p>
              </div>
              <div className="rounded-2xl bg-white/35 backdrop-blur-md border border-white/40 p-4 text-left shadow-warm col-span-2 sm:col-span-1">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Address</p>
                <p className="text-xs font-semibold text-gray-900 truncate" title={checkoutAddress}>{checkoutAddress}</p>
              </div>
              <div className="rounded-2xl bg-white/35 backdrop-blur-md border border-white/40 p-4 text-left shadow-warm">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Phone</p>
                <p className="text-xs font-semibold text-gray-900">+91 {phone}</p>
              </div>
              <div className="rounded-2xl bg-white/35 backdrop-blur-md border border-white/40 p-4 text-left shadow-warm">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Est. Delivery</p>
                <p className="text-xs font-bold text-primary-700">{expectedTime}</p>
              </div>
            </div>

            <p className="text-xs text-stone-500 mb-8 flex items-center justify-center gap-1.5 font-medium">
              <span>📱 Mock WhatsApp confirmation dispatched</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setTrackingMode(true)}
                className="lift-3d shine-sweep inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-warm-lg"
              >
                <Compass className="w-4 h-4" /> Track Order Live
              </button>
              <Link
                href="/"
                className="lift-3d shine-sweep inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 glass border border-warm-200 text-gray-700 font-semibold hover:text-primary-600 hover:border-primary-400/30"
              >
                Back to Home
              </Link>
            </div>
          </motion.div>
        </main>
        <ChatInterface />
      </div>
    );
  }

  // Live Tracking view
  if (ordered && trackingMode) {
    const steps = [
      { id: 'placed', label: 'Order Confirmed', desc: 'Kitchen is verifying your order' },
      { id: 'preparing', label: 'Cooking', desc: 'Our chef is preparing your meal' },
      { id: 'ready', label: 'Out for Delivery', desc: 'Rider is carrying your order' },
      { id: 'completed', label: 'Delivered', desc: 'Enjoy your delicious hot meal!' },
    ];

    const getStepIndex = (status: string) => {
      if (status === 'placed') return 0;
      if (status === 'preparing') return 1;
      if (status === 'ready') return 2;
      if (status === 'completed') return 3;
      return 0;
    };

    const currentStepIdx = getStepIndex(liveStatus);

    return (
      <div className="min-h-screen text-[#EAE6DF] flex flex-col">
        <Navbar />
        <main className="flex-1 pt-32 pb-16 max-w-4xl mx-auto w-full px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass border border-warm-200 rounded-[2rem] p-6 md:p-8 shadow-warm-lg space-y-8"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-200/20 pb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTrackingMode(false)}
                  className="w-10 h-10 rounded-xl bg-white/25 hover:bg-white/35 border border-warm-200 flex items-center justify-center text-stone-600 hover:text-primary-600 hover:border-primary-400/30 transition shadow-warm"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold font-display tracking-wider text-primary-900" style={{ fontFamily: 'Cinzel, serif' }}>
                    Live Order Tracker
                  </h1>
                  <p className="text-xs text-stone-500 mt-0.5">Order ID: <span className="font-mono text-primary-700 font-bold">#{placedOrderId.slice(0, 8).toUpperCase()}...</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/25 border border-warm-200 rounded-xl px-4 py-2 w-fit shadow-warm">
                <Clock className="w-4 h-4 text-[#C5A880] animate-pulse" />
                <div className="text-left">
                  <span className="text-[9px] text-stone-500 font-bold uppercase tracking-wider block">Estimated Delivery</span>
                  <span className="text-xs font-bold text-primary-900">{expectedTime || '20-30 mins'}</span>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-12 gap-8 items-start">
              {/* Left Column: Progress Stepper */}
              <div className="md:col-span-6 space-y-6">
                <h3 className="text-sm font-bold text-primary-700 uppercase tracking-wider mb-2">Delivery Status</h3>
                
                <div className="relative pl-6 space-y-6">
                  {/* Line connecting the dots */}
                  <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-warm-200/30">
                    <div
                      className="w-full bg-primary-600 transition-all duration-500"
                      style={{
                        height: `${(currentStepIdx / (steps.length - 1)) * 100}%`,
                      }}
                    />
                  </div>

                  {steps.map((step, idx) => {
                    const isCompleted = idx < currentStepIdx;
                    const isActive = idx === currentStepIdx;
                    const isUpcoming = idx > currentStepIdx;

                    return (
                      <div key={step.id} className="relative flex gap-4">
                        {/* Dot indicator */}
                        <div
                          className={`absolute -left-[22px] top-1 w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-300 ${
                            isCompleted
                              ? 'bg-primary-600 border-primary-600 text-white'
                              : isActive
                              ? 'bg-white border-primary-600 text-primary-700 ring-4 ring-primary-600/10 shadow-warm'
                              : 'bg-white border-warm-200 text-stone-400'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-white stroke-[3px]" />
                          ) : (
                            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-primary-600 animate-ping' : 'bg-stone-300'}`} />
                          )}
                        </div>

                        <div className="flex-1">
                          <p
                            className={`text-sm font-bold transition-colors ${
                              isActive ? 'text-primary-900' : isCompleted ? 'text-stone-700 font-semibold' : 'text-stone-400'
                            }`}
                          >
                            {step.label}
                          </p>
                          <p className={`text-xs mt-0.5 ${isActive ? 'text-primary-600 font-medium' : 'text-stone-500'}`}>
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Tracking Map */}
              <div className="md:col-span-6 space-y-4">
                <h3 className="text-sm font-bold text-primary-700 uppercase tracking-wider">Live Map Tracking</h3>
                <div className="relative rounded-2xl overflow-hidden border border-warm-200 shadow-warm">
                  <svg viewBox="0 0 100 60" className="w-full h-44 bg-white/45 backdrop-blur-md p-4">
                    <defs>
                      <pattern id="map-grid-tracking" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(197, 168, 128, 0.08)" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="100" height="60" fill="url(#map-grid-tracking)" />
                    
                    {/* Glowing Route Line */}
                    <path d="M 20,45 C 40,45 40,15 80,15" fill="none" stroke="rgba(197, 168, 128, 0.2)" strokeWidth="4.5" strokeLinecap="round" />
                    <path
                      d="M 20,45 C 40,45 40,15 80,15"
                      fill="none"
                      stroke="#8C7355"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="5 4"
                      className="animate-[dash_6s_linear_infinite]"
                    />
                    
                    {/* Restaurant marker */}
                    <circle cx="20" cy="45" r="4" fill="#8C7355" />
                    <text x="20" y="53" fill="#8C7355" fontSize="3" fontWeight="bold" textAnchor="middle">Shop</text>
                    
                    {/* Customer marker */}
                    <circle cx="80" cy="15" r="4" fill="#2F2519" />
                    <text x="80" y="23" fill="#2F2519" fontSize="3" fontWeight="bold" textAnchor="middle">Drop</text>
                    
                    {/* Bicycle animation based on status */}
                    {liveStatus !== 'placed' && liveStatus !== 'completed' && (
                      <g className="animate-bounce" style={{ animationDuration: '2s' }}>
                        <circle cx="20" cy="45" r="3.5" fill="#8C7355" />
                        <circle cx="20" cy="45" r="6.5" fill="none" stroke="#8C7355" strokeWidth="0.5" className="animate-ping" style={{ animationDuration: '1.5s' }} />
                        <animateMotion
                          dur="12s"
                          repeatCount="indefinite"
                          path="M 20,45 C 40,45 40,15 80,15"
                        />
                      </g>
                    )}

                    {liveStatus === 'completed' && (
                      <g>
                        <circle cx="80" cy="15" r="3.5" fill="#1D3B24" />
                        <circle cx="80" cy="15" r="6.5" fill="none" stroke="#1D3B24" strokeWidth="0.5" className="animate-ping" />
                      </g>
                    )}
                  </svg>
                  
                  <div className="absolute bottom-3 left-3 bg-white/95 border border-warm-200 rounded-xl px-3 py-1.5 text-[10px] text-stone-700 font-semibold flex items-center gap-1.5 shadow-warm">
                    <Bike className="w-3.5 h-3.5 text-[#C5A880]" />
                    <span>
                      {liveStatus === 'placed' && 'Preparing in kitchen...'}
                      {liveStatus === 'preparing' && 'Chef is cooking...'}
                      {liveStatus === 'ready' && `Rider en route (${distance} KM)`}
                      {liveStatus === 'completed' && 'Order Delivered!'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="border-t border-warm-200/20 pt-6 flex flex-col sm:flex-row justify-between gap-4 items-center">
              <div className="text-xs text-stone-500 text-center sm:text-left">
                <span className="block font-semibold">Delivery Address:</span>
                <span className="text-primary-900 mt-0.5 block font-semibold">{checkoutAddress}</span>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setOrdered(false);
                    setAddress('Garhwa, Jharkhand, India');
                    setDistance(4.2);
                    setPlacedOrderId('');
                    setTrackingMode(false);
                  }}
                  className="w-full sm:w-auto lift-3d shine-sweep px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold uppercase tracking-wider transition duration-300 flex items-center justify-center gap-1.5 shadow-warm-lg"
                >
                  Order Something Else
                </button>
                <Link
                  href="/"
                  className="w-full sm:w-auto lift-3d shine-sweep px-6 py-3 rounded-xl border border-warm-200 bg-transparent text-gray-700 font-semibold hover:text-primary-600 hover:border-primary-400/30 text-xs uppercase tracking-wider transition duration-300 flex items-center justify-center"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </motion.div>
        </main>
        <ChatInterface />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#EAE6DF] flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-16 px-4 max-w-[96rem] mx-auto w-full">
        {/* Zomato-Style Location Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto mb-8 flex items-center justify-between p-3.5 px-6 rounded-2xl glass border border-warm-200 shadow-warm-md"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8.5 h-8.5 rounded-xl bg-primary-600/10 border border-primary-450/20 flex items-center justify-center text-primary-600 flex-shrink-0">
              <MapPin className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <div className="truncate">
              <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">Delivering To</span>
              <span className="text-sm font-semibold text-primary-900">{address || 'Garhwa, Jharkhand, India'}</span>
            </div>
          </div>
          {distance && (
            <div className="text-right flex-shrink-0">
              <span className="text-[10px] text-stone-500 block font-bold uppercase tracking-wider">Distance</span>
              <span className="text-xs font-bold text-primary-700">{distance} KM</span>
            </div>
          )}
        </motion.div>
        
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="text-xs text-primary-600 uppercase tracking-widest mb-2 font-medium inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-ping" />
            Home Delivery Ecosystem
          </span>
          <h1
            className="font-display text-4xl sm:text-5xl font-bold gradient-text mb-4"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Express Delivery
          </h1>
          <p className="text-stone-500 text-sm max-w-xl mx-auto">
            Order fresh, high-protein & vegetarian creations straight to your doorstep. Pinpoint your coordinates below.
          </p>
        </motion.div>

        {/* Top Section: Address Input & Locate Me */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-4xl mx-auto mb-12 p-6 rounded-[2rem] glass border border-warm-200 shadow-warm-lg flex flex-col md:flex-row gap-4 items-end"
        >
          <div className="flex-1 w-full space-y-2">
            <label className="text-xs font-bold text-primary-750 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary-600" /> Enter Delivery Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder="e.g. Plot 24, Cyber Hills, Phase II"
              className="w-full bg-white/45 backdrop-blur-md border border-white/40 focus:border-primary-600/50 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:shadow-warm"
            />
          </div>
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locating}
            className="lift-3d shine-sweep w-full md:w-auto h-[46px] inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-300 shadow-warm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {locating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" /> Locating...
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 text-white" /> Locate Me (GPS)
              </>
            )}
          </button>
        </motion.div>

        {/* Layout Grid */}
        <div className="grid lg:grid-cols-12 gap-8">

          {/* Menu Section (Left 8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Search & Categories */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search delivery dishes…"
                  className="w-full pl-10 pr-4 py-2.5 glass border border-warm-200 focus:border-primary-400/50 rounded-xl text-sm text-primary-900 placeholder-stone-400 outline-none transition-all focus:shadow-warm"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <SlidersHorizontal className="w-4 h-4 text-stone-500 flex-shrink-0" />
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`lift-3d px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300
                      ${category === c
                        ? 'bg-primary-600/10 border border-primary-400/40 text-primary-700 shadow-warm'
                        : 'glass border border-warm-200 text-stone-600 hover:border-primary-400/30 hover:text-primary-700'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-72 glass-dark rounded-[2rem] animate-pulse border border-warm-200/10" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-20 text-red-400 border border-red-500/20 bg-red-500/5 rounded-[2rem] shadow-warm">
                Could not load menu: {error}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-stone-500 bg-white/10 border border-dashed border-warm-200 rounded-[2rem] shadow-warm">
                No delivery items match your filters.
              </div>
            ) : (
              <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map((dish) => (
                  <motion.div key={dish.id} layout>
                    <DishCard dish={dish} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Cart & Checkout Panel (Right 4 cols) */}
          <div className="lg:col-span-4">
            <div className="sticky top-32 space-y-6">
              
              <div className="glass border border-warm-200 rounded-[2rem] p-6 shadow-warm-lg">
                
                <h3 className="font-display text-lg font-bold text-[#EAE6DF] mb-5 flex items-center gap-2" style={{ fontFamily: 'Cinzel, serif' }}>
                  <ShoppingCart className="w-5 h-5 text-[#C5A880]" /> Delivery Cart
                </h3>

                {/* Items List */}
                {items.length === 0 ? (
                  <div className="text-center py-12 text-stone-500">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-stone-600" />
                    <p className="text-xs">Your delivery cart is currently empty</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 mb-6">
                    <AnimatePresence>
                      {items.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          exit={{ opacity: 0, x: -20 }}
                          className="flex gap-3 items-center py-2 border-b border-warm-200/20 last:border-b-0"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#EAE6DF] text-sm truncate">{item.name}</p>
                            <p className="text-xs text-[#EAE6DF]/60 mt-0.5">₹{item.price} x {item.qty}</p>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => updateQty(item.id, item.qty - 1)}
                              className="w-5 h-5 rounded bg-[#C5A880]/10 border border-[#C5A880]/20 hover:border-[#C5A880]/50 hover:bg-[#C5A880]/20 flex items-center justify-center text-[#C5A880] transition"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="text-xs font-bold w-4 text-center text-[#EAE6DF]">{item.qty}</span>
                            <button
                              onClick={() => updateQty(item.id, item.qty + 1)}
                              className="w-5 h-5 rounded bg-[#C5A880]/10 border border-[#C5A880]/20 hover:border-[#C5A880]/50 hover:bg-[#C5A880]/20 flex items-center justify-center text-[#C5A880] transition"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          <span className="text-xs font-bold text-[#C5A880] w-16 text-right">
                            ₹{(item.price * item.qty).toFixed(0)}
                          </span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Cost Breakdown */}
                <div className="border-t border-warm-200/20 pt-4 space-y-3">
                  <div className="flex justify-between text-xs text-[#EAE6DF]/60">
                    <span>Subtotal</span>
                    <span className="font-semibold text-[#EAE6DF]">₹{subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#EAE6DF]/60">
                    <span>GST (5%)</span>
                    <span className="font-semibold text-[#EAE6DF]">₹{gst.toFixed(0)}</span>
                  </div>

                  {/* Delivery Info */}
                  <div className="flex justify-between text-xs text-[#EAE6DF]/60 items-start">
                    <div>
                      <span>Delivery Fee</span>
                      {distance && (
                        <span className="text-[10px] text-stone-500 block">({distance} KM away)</span>
                      )}
                    </div>
                    {distance ? (
                      <span className="font-semibold text-[#EAE6DF]">₹{deliveryFee}</span>
                    ) : (
                      <span className="text-[10px] text-[#C5A880] font-medium italic">Enter address to calculate</span>
                    )}
                  </div>

                  {/* Delivery Time Indicator */}
                  {expectedTime && (
                    <div className="flex justify-between items-center text-xs text-[#C5A880] font-semibold bg-[#C5A880]/5 border border-[#C5A880]/15 p-2.5 rounded-xl mt-2">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Expected Time:
                      </span>
                      <span>{expectedTime}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-bold text-[#EAE6DF] text-sm border-t border-warm-200/20 pt-3 mt-3">
                    <span>Total Amount</span>
                    <span className="text-[#C5A880] font-bold text-base">₹{grandTotal.toFixed(0)}</span>
                  </div>
                </div>

                {/* Checkout Trigger */}
                <button
                  onClick={openCheckoutDetails}
                  disabled={items.length === 0}
                  className="w-full mt-6 py-3.5 rounded-xl bg-[#C5A880] hover:bg-[#D5C3AE] disabled:bg-stone-900/60 disabled:text-stone-600 disabled:border disabled:border-[#C5A880]/5 text-[#0A0A0A] font-extrabold text-xs uppercase tracking-wider transition-all duration-300 lift-3d shadow-warm-lg disabled:shadow-none flex items-center justify-center gap-2"
                >
                  Place Delivery Order <ArrowRight className="w-4 h-4" />
                </button>

                {orderError && (
                  <p className="text-xs text-red-400 mt-3 text-center font-medium bg-red-500/5 p-2 rounded-lg border border-red-500/15">
                    {orderError}
                  </p>
                )}
              </div>

            </div>
          </div>

        </div>

      </main>

      {/* Sleek Pre-Payment Checkout Details Modal */}
      <AnimatePresence>
        {checkoutModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCheckoutModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md mx-4 p-4 md:p-8 glass border border-warm-200 rounded-[2rem] shadow-warm-lg space-y-6 overflow-hidden"
            >
              {/* Top Accent line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C5A880] to-[#EAE6DF]" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#C5A880] animate-pulse" />
                  <h3 className="text-lg font-bold font-display tracking-wider text-slate-100" style={{ fontFamily: 'Cinzel, serif' }}>
                    Delivery Details
                  </h3>
                </div>
                <button
                  onClick={() => setCheckoutModalOpen(false)}
                  className="text-stone-500 hover:text-stone-300 hover:bg-white/10 text-xs font-bold px-2.5 py-1.5 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-4">
                {/* Text Area for Complete Address */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.25em] text-[#F3F4F6] font-semibold flex items-center gap-1.5">
                    Complete Address (House/Flat No., Landmark) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={checkoutAddress}
                    onChange={(e) => {
                      setCheckoutAddress(e.target.value);
                      setOrderError('');
                    }}
                    rows={3}
                    placeholder="e.g. Flat 402, Royal Palms, opposite Cyber Park"
                    className="w-full bg-white/10 backdrop-blur-md border border-white/20 focus:border-primary-400/50 rounded-xl px-4 py-3 text-sm text-[#FFFFFF] placeholder-gray-400 outline-none transition-all focus:shadow-warm resize-none"
                  />
                </div>

                {/* Input Field for Phone Number */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.25em] text-[#F3F4F6] font-semibold flex items-center gap-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#F3F4F6] font-semibold">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); // allow digits only, limit to 10
                        setOrderError('');
                      }}
                      placeholder="9876543210"
                      className="w-full bg-white/10 backdrop-blur-md border border-white/20 focus:border-primary-400/50 rounded-xl pl-14 pr-4 py-3 text-sm text-[#FFFFFF] placeholder-gray-400 outline-none transition-all focus:shadow-warm"
                    />
                  </div>
                </div>
              </div>

              {/* Order total summary inside modal */}
              <div className="p-4 bg-white/10 rounded-2xl border border-white/20 text-xs space-y-2.5 shadow-warm">
                <div className="flex justify-between text-[#F3F4F6] font-medium">
                  <span>Items Count:</span>
                  <span className="text-[#FFFFFF] font-semibold">{items.reduce((acc, curr) => acc + curr.qty, 0)} items</span>
                </div>
                <div className="flex justify-between text-[#F3F4F6] font-medium">
                  <span>Grand Total (incl. taxes & delivery):</span>
                  <span className="text-[#FFFFFF] font-bold text-sm">₹{grandTotal.toFixed(0)}</span>
                </div>
              </div>

              {/* Action Error if any */}
              {orderError && (
                <p className="text-xs text-red-400 text-center font-medium bg-red-500/5 p-2.5 rounded-lg border border-red-500/15">
                  {orderError}
                </p>
              )}

              {/* Proceed to Payment Button */}
              <button
                onClick={handleCheckout}
                disabled={ordering || !checkoutAddress.trim() || phone.length < 10}
                className="w-full py-4 rounded-xl bg-[#C5A880] hover:bg-[#D5C3AE] disabled:bg-stone-900/60 disabled:text-stone-605 disabled:border disabled:border-stone-850 text-[#FFFFFF] font-extrabold text-xs uppercase tracking-wider transition-all duration-300 shadow-warm-lg disabled:shadow-none flex items-center justify-center gap-2"
              >
                {ordering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing Payment...
                  </>
                ) : (
                  <>
                    Proceed to Payment <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ChatInterface />
    </div>
  );
}
