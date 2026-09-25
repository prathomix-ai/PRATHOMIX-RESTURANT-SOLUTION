'use client';
import { motion } from 'framer-motion';
import { Clock, ChefHat, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

interface KitchenOrderCardProps {
  order: {
    id: string;
    table_number?: number | null;
    dish_names: string[];
    status: string;
    created_at: string;
  };
  onStatusUpdate: (orderId: string, status: string) => Promise<void>;
}

export default function KitchenOrderCard({ order, onStatusUpdate }: KitchenOrderCardProps) {
  const [updating, setUpdating] = useState(false);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getTimeElapsed = (dateStr: string) => {
    const now = new Date();
    const orderTime = new Date(dateStr);
    const diffMs = now.getTime() - orderTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins;
  };

  const timeElapsed = getTimeElapsed(order.created_at);
  const isUrgent = timeElapsed > 15;
  const tableNumber = order.table_number ?? '—';

  const itemCounts = order.dish_names.reduce<Record<string, number>>((counts, dish) => {
    counts[dish] = (counts[dish] ?? 0) + 1;
    return counts;
  }, {});

  const statusActionMap: Record<string, { nextStatus: string; label: string }> = {
    placed: { nextStatus: 'preparing', label: 'Mark as Preparing' },
    preparing: { nextStatus: 'ready', label: 'Mark as Ready to Serve' },
    ready: { nextStatus: 'served', label: 'Mark as Served' },
  };

  const statusAction = statusActionMap[order.status];

  const handleStatusUpdate = async () => {
    if (!statusAction) return;
    setUpdating(true);
    try {
      await onStatusUpdate(order.id, statusAction.nextStatus);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`glass rounded-2xl border-2 p-4 flex flex-col gap-3 min-w-72
                  transition-all duration-300
                  ${isUrgent && order.status === 'placed' ? 'border-accent-red/60 bg-accent-red/5 shadow-warm-lg' : 'border-warm-200 hover:border-primary-400/30'}`}>

      {/* Table Number - PROMINENT */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold">Table</p>
          <p className="text-4xl font-display font-bold text-primary-600" style={{ fontFamily: 'Cinzel, serif' }}>
            {tableNumber}
          </p>
        </div>
        {isUrgent && order.status === 'placed' && (
          <div className="flex items-center gap-1 px-2.5 py-1 bg-accent-red/20 border border-accent-red/40 rounded-full">
            <span className="w-2 h-2 rounded-full bg-accent-red animate-pulse"></span>
            <span className="text-xs font-semibold text-accent-red">Urgent</span>
          </div>
        )}
      </div>

      {/* Order Time */}
      <div className="flex items-center gap-2 pt-1">
        <Clock className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-600">
          Placed {formatTime(order.created_at)}
        </span>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-gradient-to-r from-primary-400/0 via-primary-400/20 to-primary-400/0"></div>

      {/* Items List */}
      <div className="flex-1">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">Items</p>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {Object.entries(itemCounts).map(([dish, quantity]) => (
            <div key={dish} className="flex items-start gap-2">
              <span className="text-xs font-bold text-primary-600 min-w-5">×{quantity}</span>
              <span className="text-sm text-gray-700 font-medium leading-tight flex-1">{dish}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status Badge */}
      <div className="pt-2">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                         ${order.status === 'placed' ? 'bg-blue-100 text-blue-700' :
                           order.status === 'preparing' ? 'bg-yellow-100 text-yellow-700' :
                           'bg-green-100 text-green-700'}`}>
          {order.status === 'placed' ? <ChefHat className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      </div>

      {/* Action Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleStatusUpdate}
        disabled={updating || !statusAction}
        className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all duration-200
                    ${!statusAction
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 text-white shadow-warm hover:shadow-warm-md'}`}>
        {updating ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Updating...
          </div>
        ) : (
          statusAction?.label ?? 'No Action'
        )}
      </motion.button>
    </motion.div>
  );
}
