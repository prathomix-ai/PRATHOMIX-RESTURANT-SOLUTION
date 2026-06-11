'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Power, MapPin, Navigation, CheckCircle2, RefreshCw, Loader2, ArrowRightCircle, Sparkles, TrendingUp, DollarSign, Bike, Map, MapPinIcon } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import type { Order } from '@/lib/supabase';

// Helper to calculate address metadata deterministically if not in localStorage
function getDeliveryMetadata(orderId: string) {
  if (typeof window === 'undefined') return { address: 'Prathomix Towers, Phase 1', distance: 3.5, fee: 55, expectedTime: '20-30 mins' };
  
  const stored = JSON.parse(localStorage.getItem('delivery_orders_metadata') || '{}');
  if (stored[orderId]) return stored[orderId];

  // Deterministic fallback based on UUID string digits
  const addresses = [
    '12 Pine Street, Block C, High-rise',
    'Penthouse 9, Apex Heights, Sector 62',
    'Flat 402, Oakwood Residency, Lane 4',
    '742 Evergreen Terrace, Sector 5',
    'Prathomix Residency, Block B'
  ];
  
  const num = parseInt(orderId.replace(/[^0-9]/g, '').slice(-3) || '0', 10);
  const address = addresses[num % addresses.length];
  const distance = parseFloat(((num % 6) + 1.8).toFixed(1)); // 1.8 to 7.8 KM
  const fee = Math.round(distance * 10 + 25); // base 25 + 10/km
  const expectedTime = `${Math.round(distance * 4 + 15)}-${Math.round(distance * 4 + 25)} mins`;

  return { address, distance, fee, expectedTime };
}

export default function RiderDashboard() {
  const [isOnline, setIsOnline] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [showNavigationModal, setShowNavigationModal] = useState(false);

  // Earnings stats
  const [completedCount, setCompletedCount] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);

  // Security check: Redirect to login if not authenticated
  useEffect(() => {
    if (typeof document !== 'undefined' && !document.cookie.includes('prathomix_staff_role=rider')) {
      window.location.href = '/rider/login';
    }
  }, []);

  // Sync earnings from localStorage
  useEffect(() => {
    const storedCount = localStorage.getItem('rider_completed_count');
    const storedEarnings = localStorage.getItem('rider_completed_earnings');
    if (storedCount) setCompletedCount(parseInt(storedCount, 10));
    if (storedEarnings) setTodayEarnings(parseInt(storedEarnings, 10));

    // Load active order state if page is refreshed
    const savedActiveOrder = localStorage.getItem('rider_active_order');
    if (savedActiveOrder) {
      try {
        setActiveOrder(JSON.parse(savedActiveOrder));
      } catch (e) {
        console.error('Failed to parse saved active order:', e);
      }
    }
  }, []);

  // Fetch Delivery Orders (table_number = 999)
  async function fetchDeliveryOrders() {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('table_number', 999)
        .in('status', ['placed', 'preparing', 'ready'])
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setOrders(data || []);
      
      // If we have an active order, double check if it is still active/not completed
      if (activeOrder) {
        const liveActive = (data || []).find((o) => o.id === activeOrder.id);
        // If it got completed elsewhere or deleted, clear local active
        const { data: checkData } = await supabase
          .from('orders')
          .select('status')
          .eq('id', activeOrder.id)
          .single();
        if (checkData && checkData.status === 'completed') {
          setActiveOrder(null);
          localStorage.removeItem('rider_active_order');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load orders');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDeliveryOrders();

    // Set up realtime channel
    const channel = supabase.channel('realtime:delivery_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: 'table_number=eq.999' },
      () => { fetchDeliveryOrders(); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrder?.id]);

  // Handle Online Toggle
  const handleOnlineToggle = () => {
    setIsOnline(!isOnline);
  };

  // Handle Logout
  const handleLogout = () => {
    document.cookie = 'prathomix_staff_role=; path=/; max-age=0; samesite=lax';
    localStorage.removeItem('rider_active_order');
    window.location.href = '/rider/login';
  };

  // Accept Order
  const handleAcceptOrder = async (order: Order) => {
    setUpdatingId(order.id);
    try {
      // Transition status to preparing (meaning Accepted by Rider)
      const { data, error: updateError } = await supabase
        .from('orders')
        .update({ status: 'preparing' })
        .eq('id', order.id)
        .select()
        .single();

      if (updateError) throw updateError;

      const accepted = data || order;
      setActiveOrder(accepted);
      localStorage.setItem('rider_active_order', JSON.stringify(accepted));
      await fetchDeliveryOrders();
    } catch (e) {
      console.error(e);
      setError('Failed to accept order.');
    } finally {
      setUpdatingId('');
    }
  };

  // Mark as Delivered
  const handleMarkAsDelivered = async () => {
    if (!activeOrder) return;
    setUpdatingId(activeOrder.id);
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', activeOrder.id);

      if (updateError) throw updateError;

      // Calculate pay
      const meta = getDeliveryMetadata(activeOrder.id);
      const deliveryEarnings = meta.fee + 40; // fee + ₹40 base pay
      
      const nextCount = completedCount + 1;
      const nextEarnings = todayEarnings + deliveryEarnings;

      setCompletedCount(nextCount);
      setTodayEarnings(nextEarnings);

      localStorage.setItem('rider_completed_count', String(nextCount));
      localStorage.setItem('rider_completed_earnings', String(nextEarnings));

      // Clean up active order state
      setActiveOrder(null);
      localStorage.removeItem('rider_active_order');
      await fetchDeliveryOrders();
    } catch (e) {
      console.error(e);
      setError('Failed to update delivery status.');
    } finally {
      setUpdatingId('');
    }
  };

  // Get active order metadata if exists
  const activeOrderMeta = useMemo(() => {
    if (!activeOrder) return null;
    return getDeliveryMetadata(activeOrder.id);
  }, [activeOrder?.id]);

  return (
    <div className="min-h-screen text-slate-100 flex flex-col relative pb-24">
      <Navbar />

      <main className="flex-1 pt-32 px-4 md:px-8 max-w-md md:max-w-xl mx-auto w-full flex flex-col gap-6">
        
        {/* Header Summary */}
        <div className="flex justify-between items-center glass p-5 rounded-3xl shadow-lg">
          <div>
            <span className="text-[10px] bg-[#C5A880]/10 border border-[#C5A880]/30 text-[#C5A880] font-bold px-2.5 py-0.5 rounded-full leading-tight tracking-wider uppercase inline-flex items-center gap-1 mb-1">
              <Bike className="w-3 h-3" /> Delivery Partner
            </span>
            <h1 className="text-xl font-bold text-slate-100">Rider Dashboard</h1>
            <p className="text-xs text-stone-400 mt-0.5">Welcome, Partner Alpha-7</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 font-bold rounded-xl transition duration-300"
            >
              Logout
            </button>
            <button
              onClick={fetchDeliveryOrders}
              className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-2xl flex items-center justify-center transition border border-slate-700"
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>

        {/* Online Status Toggle */}
        <div className="glass p-5 rounded-3xl shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`relative flex h-3.5 w-3.5`}>
              {isOnline ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C5A880] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#C5A880]"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-slate-600"></span>
              )}
            </span>
            <div>
              <p className="text-sm font-bold text-slate-200">
                {isOnline ? 'Online & Active' : 'Offline'}
              </p>
              <p className="text-xs text-stone-400">
                {isOnline ? 'Searching for delivery requests...' : 'Turn online to receive orders'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleOnlineToggle}
            className={`w-14 h-8 rounded-full transition-all duration-300 p-1 flex items-center relative ${
              isOnline ? 'bg-[#C5A880]/20 border border-[#C5A880]/40 justify-end' : 'bg-slate-800 border border-slate-700 justify-start'
            }`}
          >
            <motion.div
              layout
              className={`w-6 h-6 rounded-full flex items-center justify-center transition shadow-md ${
                isOnline ? 'bg-[#C5A880]' : 'bg-slate-500'
              }`}
            >
              <Power className={`w-3.5 h-3.5 ${isOnline ? 'text-slate-950' : 'text-slate-200'}`} />
            </motion.div>
          </button>
        </div>

        {/* Errors if any */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-xs text-red-400 font-medium">
            {error}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* OFFLINE STATE */}
          {!isOnline && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center bg-stone-950/20 border border-dashed border-slate-850 rounded-3xl p-6">
              <Bike className="w-16 h-16 text-slate-700 mb-4 animate-pulse" />
              <h3 className="font-semibold text-slate-300 mb-1">You are currently Offline</h3>
              <p className="text-xs text-stone-500 max-w-xs mb-6">
                Go online using the status toggle above to see active home delivery orders.
              </p>
              <button
                onClick={() => setIsOnline(true)}
                className="px-6 py-2.5 rounded-xl bg-[#C5A880] hover:bg-[#D5C3AE] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider transition duration-300 shadow-[0_0_15px_rgba(197,168,128,0.2)]"
              >
                Go Online
              </button>
            </div>
          )}

          {/* ONLINE & HAS NO ACTIVE ORDER: SHOW REQUESTS */}
          {isOnline && !activeOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#C5A880] uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#C5A880] animate-pulse" /> Available Delivery Requests
                </span>
                <span className="text-xs text-stone-500">
                  {loading ? 'Refreshing...' : `${orders.length} found`}
                </span>
              </div>

              {loading && orders.length === 0 ? (
                <div className="py-16 flex items-center justify-center glass rounded-3xl">
                  <Loader2 className="w-8 h-8 animate-spin text-[#C5A880]" />
                </div>
              ) : orders.length === 0 ? (
                <div className="py-16 text-center glass rounded-3xl p-6">
                  <Map className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-400 mb-1">No Orders Nearby</p>
                  <p className="text-xs text-stone-500">Waiting for customers to check out delivery orders...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <AnimatePresence>
                    {orders.map((order) => {
                      const meta = getDeliveryMetadata(order.id);
                      const isAccepting = updatingId === order.id;

                      return (
                        <motion.div
                          key={order.id}
                          layout
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="glass rounded-3xl p-5 shadow-lg relative overflow-hidden flex flex-col gap-4"
                        >
                          <div className="absolute top-0 right-0 w-24 h-1.5 bg-gradient-to-l from-[#C5A880] to-transparent" />
                          
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] text-[#C5A880] font-mono tracking-wider">ORDER #{order.id.slice(0, 8).toUpperCase()}</span>
                              <h3 className="font-bold text-slate-200 mt-0.5">₹{order.total_amount} Delivery</h3>
                            </div>
                            <span className="text-xs bg-stone-900 text-[#C5A880] font-bold border border-[#C5A880]/25 px-2.5 py-1 rounded-full flex items-center gap-1 leading-none shadow-[0_0_10px_rgba(197,168,128,0.1)]">
                              {meta.distance} KM
                            </span>
                          </div>

                          {/* Pickup -> Drop Info */}
                          <div className="relative pl-5 py-0.5 space-y-4 border-l border-dashed border-[#C5A880]/20">
                            {/* Dot Indicators */}
                            <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-[#C5A880] flex items-center justify-center border border-slate-950">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                            </div>
                            <div className="absolute -left-1.5 bottom-0 w-3 h-3 rounded-full bg-[#EAE6DF] flex items-center justify-center border border-slate-950">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                            </div>

                            <div className="text-xs">
                              <p className="text-stone-500 uppercase tracking-widest text-[9px] font-bold">Pickup Location</p>
                              <p className="text-slate-200 font-medium mt-0.5">Prathomix Premium Kitchen</p>
                            </div>
                            <div className="text-xs">
                              <p className="text-stone-500 uppercase tracking-widest text-[9px] font-bold">Drop Location</p>
                              <p className="text-slate-200 font-medium mt-0.5">{meta.address}</p>
                            </div>
                          </div>

                          {/* Order items quick summary */}
                          <div className="bg-stone-950/45 p-3 rounded-xl border border-[#C5A880]/10 text-xs">
                            <span className="text-stone-500 font-medium">Items: </span>
                            <span className="text-slate-300 font-bold">{(order.dish_names || []).join(', ')}</span>
                          </div>

                          <div className="flex justify-between items-center text-xs text-slate-400 border-t border-slate-800/80 pt-4 mt-2">
                            <div>
                              <span>Delivery Pay: </span>
                              <span className="text-[#C5A880] font-bold">₹{meta.fee + 40}</span>
                            </div>
                            <span>Est: {meta.expectedTime}</span>
                          </div>

                          <button
                            onClick={() => handleAcceptOrder(order)}
                            disabled={isAccepting}
                            className="w-full py-3.5 rounded-2xl bg-[#C5A880] hover:bg-[#D5C3AE] disabled:bg-slate-800 text-[#0A0A0A] font-extrabold text-xs uppercase tracking-wider transition-all duration-300 lift-3d shadow-[0_0_15px_rgba(197,168,128,0.2)] flex items-center justify-center gap-2"
                          >
                            {isAccepting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Accepting...
                              </>
                            ) : (
                              <>
                                Accept Order <ArrowRightCircle className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {/* ONLINE & HAS ACTIVE ORDER: SHOW MAP & DELIVER CONTROLS */}
          {isOnline && activeOrder && activeOrderMeta && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass p-5 rounded-3xl shadow-xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[9px] text-[#0A0A0A] bg-[#C5A880] font-bold uppercase tracking-widest block border border-[#C5A880] px-2.5 py-0.5 rounded-full w-max leading-none shadow-[0_0_10px_rgba(197,168,128,0.2)]">
                    Active Delivery
                  </span>
                  <h3 className="font-bold text-slate-200 mt-2">En Route to Customer</h3>
                </div>
                <span className="text-xs text-stone-200 font-semibold bg-stone-900 px-3 py-1.5 rounded-xl border border-[#C5A880]/20">
                  Est: {activeOrderMeta.expectedTime}
                </span>
              </div>

              {/* LIVE MAP ANIMATION */}
              <div className="space-y-2">
                <span className="text-xs text-stone-400 font-semibold block">Live Tracking Map</span>
                <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
                  <svg viewBox="0 0 100 60" className="w-full h-44 bg-slate-950 p-4">
                    <defs>
                      <pattern id="map-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="100" height="60" fill="url(#map-grid)" />
                    
                    {/* Glowing Accent Path Line */}
                    <path d="M 20,45 C 40,45 40,15 80,15" fill="none" stroke="rgba(197, 168, 128, 0.15)" strokeWidth="4.5" strokeLinecap="round" />
                    <path d="M 20,45 C 40,45 40,15 80,15" fill="none" stroke="#C5A880" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 4" className="animate-[dash_6s_linear_infinite]" />
                    
                    <style>{`
                      @keyframes dash {
                        to {
                          stroke-dashoffset: -20;
                        }
                      }
                    `}</style>
                    
                    {/* Restaurant marker */}
                    <circle cx="20" cy="45" r="4.5" fill="#C5A880" />
                    <circle cx="20" cy="45" r="8" fill="none" stroke="#C5A880" strokeWidth="1" className="animate-ping opacity-60" style={{ animationDuration: '3s' }} />
                    <text x="20" y="54" fill="#C5A880" fontSize="3" fontWeight="extrabold" textAnchor="middle">Shop</text>
                    
                    {/* Customer marker */}
                    <circle cx="80" cy="15" r="4.5" fill="#EAE6DF" />
                    <circle cx="80" cy="15" r="8" fill="none" stroke="#EAE6DF" strokeWidth="1" className="animate-ping opacity-60" style={{ animationDuration: '3.5s' }} />
                    <text x="80" y="24" fill="#EAE6DF" fontSize="3" fontWeight="extrabold" textAnchor="middle">Drop</text>
                    
                    {/* Bicycle animated rider */}
                    <g className="animate-bounce" style={{ animationDuration: '2.5s' }}>
                      <circle cx="20" cy="45" r="3" fill="#C5A880" />
                      <circle cx="20" cy="45" r="5" fill="none" stroke="#C5A880" strokeWidth="0.5" className="animate-ping" style={{ animationDuration: '1.5s' }} />
                      <animateMotion dur="8s" repeatCount="indefinite" path="M 20,45 C 40,45 40,15 80,15" />
                    </g>
                  </svg>
                  
                  <div className="absolute bottom-3 left-3 bg-stone-900/95 border border-[#C5A880]/20 rounded-xl px-3 py-1.5 text-[10px] text-stone-200 font-medium flex items-center gap-1.5 shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                    <Bike className="w-3.5 h-3.5 text-[#C5A880] animate-pulse" />
                    <span>Rider en route ({activeOrderMeta.distance} KM)</span>
                  </div>
                </div>
              </div>

              {/* Order Info & Address */}
              <div className="p-4 bg-stone-950/50 border border-[#C5A880]/15 rounded-2xl space-y-3">
                <div className="text-xs">
                  <span className="text-stone-500 font-medium block">RESTAURANT (PICKUP)</span>
                  <span className="text-slate-200 font-semibold block mt-0.5">Prathomix Premium Kitchen</span>
                </div>
                <div className="h-px bg-slate-800/80" />
                <div className="text-xs">
                  <span className="text-stone-500 font-medium block">CUSTOMER (DROP ADDRESS)</span>
                  <span className="text-slate-200 font-semibold block mt-0.5">{activeOrderMeta.address}</span>
                </div>
                <div className="h-px bg-slate-800/80" />
                <div className="text-xs">
                  <span className="text-stone-500 font-medium block">ITEMS TO DELIVER</span>
                  <span className="text-slate-200 font-semibold block mt-0.5">{(activeOrder.dish_names || []).join(', ')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setShowNavigationModal(true)}
                  className="w-full py-3 rounded-xl bg-transparent hover:bg-[#C5A880]/10 border border-[#C5A880]/30 text-stone-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Navigation className="w-4 h-4 text-[#C5A880] animate-pulse" /> Navigate to Customer
                </button>
                
                <button
                  onClick={handleMarkAsDelivered}
                  disabled={updatingId === activeOrder.id}
                  className="w-full py-4 rounded-xl bg-[#C5A880] hover:bg-[#D5C3AE] disabled:bg-slate-800 text-[#0A0A0A] font-extrabold text-xs uppercase tracking-wider transition-all duration-300 lift-3d shadow-[0_0_20px_rgba(197,168,128,0.25)] flex items-center justify-center gap-2"
                >
                  {updatingId === activeOrder.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Updating Status...
                    </>
                  ) : (
                    <>
                      Mark as Delivered <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

        </div>

      </main>

      {/* Navigation Modal overlay */}
      <AnimatePresence>
        {showNavigationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNavigationModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm glass border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#C5A880] uppercase tracking-widest flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5" /> GPS Navigation Route
                </span>
                <button
                  onClick={() => setShowNavigationModal(false)}
                  className="text-slate-400 hover:text-slate-200 text-xs font-bold"
                >
                  Close
                </button>
              </div>

              <h3 className="text-base font-bold text-slate-200">Directions to Customer</h3>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {[
                  { step: 'Start at Prathomix Premium Kitchen', dist: '0.0 KM' },
                  { step: 'Head north on Gourmet Boulevard towards Cyber Avenue', dist: '0.5 KM' },
                  { step: 'Turn right onto Cyber Avenue (Pass Tech Park on left)', dist: '1.2 KM' },
                  { step: 'Keep left on the flyover towards Sector 5', dist: '2.5 KM' },
                  { step: `Turn left at the traffic signal onto ${activeOrderMeta?.address.split(',')[0] || 'Customer Lane'}`, dist: '4.2 KM' },
                  { step: `Arrive at customer destination: ${activeOrderMeta?.address || 'Customer Residence'}`, dist: `${activeOrderMeta?.distance || '4.8'} KM` },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3 text-xs leading-relaxed border-l border-slate-800 pl-4 relative">
                    <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#C5A880]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-300 font-medium">{item.step}</p>
                      <span className="text-[10px] text-slate-500">{item.dist}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=Restaurant+to+${encodeURIComponent(activeOrderMeta?.address || '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 rounded-xl bg-[#C5A880] hover:bg-[#D5C3AE] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider transition duration-300 flex items-center justify-center gap-2"
                >
                  Open in Google Maps
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sticky Bottom Earnings Tab (Styles consistency with Chef/Waiter dashboards) */}
      <div className="fixed bottom-0 left-0 right-0 bg-stone-950/90 border-t border-[#C5A880]/15 backdrop-blur-md py-4 px-6 z-40">
        <div className="max-w-md mx-auto flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880] shadow-[0_0_10px_rgba(197,168,128,0.1)]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-widest text-[9px] font-bold block">Today&apos;s Jobs</span>
              <span className="text-slate-200 font-bold text-sm leading-none">{completedCount} deliveries</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880] shadow-[0_0_10px_rgba(197,168,128,0.1)]">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-widest text-[9px] font-bold block">Total Earnings</span>
              <span className="text-[#C5A880] font-extrabold text-sm leading-none">₹{todayEarnings}</span>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
