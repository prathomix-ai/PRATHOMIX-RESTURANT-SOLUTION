'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ChefHat, Clock, CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import KitchenOrderCard from '@/components/KitchenOrderCard';

interface Order {
  id: string;
  table_number?: number | null;
  dish_ids: string[];
  dish_names: string[];
  total_amount: number;
  split_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function KitchenDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchOrders = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Refresh every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status }),
      });

      if (!res.ok) throw new Error('Failed to update order');

      // Optimistic update
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status } : order
        )
      );

      // Fetch fresh data
      await fetchOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order');
    }
  };

  const placedOrders = orders.filter((o) => o.status === 'placed');
  const preparingOrders = orders.filter((o) => o.status === 'preparing');
  const readyOrders = orders.filter((o) => o.status === 'ready');

  const totalOrders = orders.filter((o) => o.status !== 'served').length;
  const urgentCount = placedOrders.filter((o) => {
    const elapsed = (new Date().getTime() - new Date(o.created_at).getTime()) / 60000;
    return elapsed > 15;
  }).length;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-warm-50 pt-20">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-50 to-warm-50 border-b border-warm-200 sticky top-16 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary-600/10 border border-primary-600/20 flex items-center justify-center">
                    <ChefHat className="w-5 h-5 text-primary-600" />
                  </div>
                  <h1 className="text-3xl font-display font-bold text-primary-900" style={{ fontFamily: 'Cinzel, serif' }}>
                    Kitchen Dashboard
                  </h1>
                </div>
                <p className="text-sm text-gray-600">Manage incoming orders in real-time</p>
              </div>

              {/* Stats & Refresh */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary-600">{totalOrders}</p>
                      <p className="text-xs text-gray-600">Active Orders</p>
                    </div>
                    {urgentCount > 0 && (
                      <div className="text-center px-3 py-2 bg-accent-red/10 border border-accent-red/30 rounded-lg">
                        <p className="text-2xl font-bold text-accent-red">{urgentCount}</p>
                        <p className="text-xs text-accent-red font-semibold">Urgent</p>
                      </div>
                    )}
                  </div>
                </div>

                <motion.button
                  whileHover={{ rotate: 180 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={fetchOrders}
                  disabled={refreshing}
                  className="w-10 h-10 rounded-lg bg-primary-600/10 border border-primary-600/20 flex items-center justify-center text-primary-600 hover:bg-primary-600/20 transition-all duration-200">
                  <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                </motion.button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </motion.div>
            )}
          </div>
        </div>

        {/* Kanban Board */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[600px]">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading orders...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Column 1: New Orders */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-blue-200">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-blue-900">New Orders</h2>
                  <span className="ml-auto px-2.5 py-0.5 bg-blue-100 text-blue-700 text-sm font-bold rounded-full">
                    {placedOrders.length}
                  </span>
                </div>

                <div className="space-y-4 min-h-96">
                  <AnimatePresence mode="popLayout">
                    {placedOrders.length === 0 ? (
                      <motion.div
                        key="empty-placed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center h-64 text-gray-400">
                        <p className="text-center text-sm">No new orders at the moment</p>
                      </motion.div>
                    ) : (
                      placedOrders.map((order) => (
                        <KitchenOrderCard
                          key={order.id}
                          order={order}
                          onStatusUpdate={handleStatusUpdate}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Column 2: Preparing */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-yellow-200">
                  <ChefHat className="w-5 h-5 text-yellow-600" />
                  <h2 className="text-lg font-semibold text-yellow-900">Preparing</h2>
                  <span className="ml-auto px-2.5 py-0.5 bg-yellow-100 text-yellow-700 text-sm font-bold rounded-full">
                    {preparingOrders.length}
                  </span>
                </div>

                <div className="space-y-4 min-h-96">
                  <AnimatePresence mode="popLayout">
                    {preparingOrders.length === 0 ? (
                      <motion.div
                        key="empty-preparing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center h-64 text-gray-400">
                        <p className="text-center text-sm">No orders being prepared</p>
                      </motion.div>
                    ) : (
                      preparingOrders.map((order) => (
                        <KitchenOrderCard
                          key={order.id}
                          order={order}
                          onStatusUpdate={handleStatusUpdate}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Column 3: Ready */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-green-200">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-semibold text-green-900">Ready to Serve</h2>
                  <span className="ml-auto px-2.5 py-0.5 bg-green-100 text-green-700 text-sm font-bold rounded-full">
                    {readyOrders.length}
                  </span>
                </div>

                <div className="space-y-4 min-h-96">
                  <AnimatePresence mode="popLayout">
                    {readyOrders.length === 0 ? (
                      <motion.div
                        key="empty-ready"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center h-64 text-gray-400">
                        <p className="text-center text-sm">No orders ready to serve</p>
                      </motion.div>
                    ) : (
                      readyOrders.map((order) => (
                        <KitchenOrderCard
                          key={order.id}
                          order={order}
                          onStatusUpdate={handleStatusUpdate}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && orders.length === 0 && (
          <div className="flex items-center justify-center min-h-[600px]">
            <div className="text-center">
              <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">All Caught Up!</h3>
              <p className="text-gray-600">No active orders. Great job!</p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
