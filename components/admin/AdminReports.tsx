'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  Utensils,
  ShoppingBag,
  Bike,
  ScrollText,
  Filter,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { DEFAULT_RESTAURANT_ID, type AuditLog } from '@/lib/supabase';

interface SalesLedgerRow {
  id: string;
  orderNumber: string;
  date: string;
  type: 'dine_in' | 'takeaway' | 'delivery';
  identifier: string; // Table 4 or Customer name
  itemCount: number;
  paymentMethod: string;
  paymentStatus: 'paid' | 'pending';
  amount: number;
  tax: number;
}

const INITIAL_SALES_LEDGER: SalesLedgerRow[] = [
  {
    id: 'ord-101',
    orderNumber: 'PX-9021',
    date: '2026-09-25 21:15',
    type: 'dine_in',
    identifier: 'Table 4 (VIP Lounge)',
    itemCount: 4,
    paymentMethod: 'UPI',
    paymentStatus: 'paid',
    amount: 3450,
    tax: 172.5,
  },
  {
    id: 'ord-102',
    orderNumber: 'PX-9020',
    date: '2026-09-25 20:40',
    type: 'dine_in',
    identifier: 'Table 8 (Main Dining)',
    itemCount: 6,
    paymentMethod: 'Card',
    paymentStatus: 'paid',
    amount: 5200,
    tax: 260.0,
  },
  {
    id: 'ord-103',
    orderNumber: 'PX-9019',
    date: '2026-09-25 20:12',
    type: 'delivery',
    identifier: 'Vikramaditya Roy (Bandra West)',
    itemCount: 3,
    paymentMethod: 'Online',
    paymentStatus: 'paid',
    amount: 2150,
    tax: 107.5,
  },
  {
    id: 'ord-104',
    orderNumber: 'PX-9018',
    date: '2026-09-25 19:30',
    type: 'takeaway',
    identifier: 'Self Pickup - Priya S.',
    itemCount: 2,
    paymentMethod: 'Cash',
    paymentStatus: 'paid',
    amount: 890,
    tax: 44.5,
  },
  {
    id: 'ord-105',
    orderNumber: 'PX-9017',
    date: '2026-09-25 18:45',
    type: 'dine_in',
    identifier: 'Table 2 (Terrace)',
    itemCount: 3,
    paymentMethod: 'UPI',
    paymentStatus: 'paid',
    amount: 1980,
    tax: 99.0,
  },
  {
    id: 'ord-106',
    orderNumber: 'PX-9016',
    date: '2026-09-25 14:10',
    type: 'dine_in',
    identifier: 'Table 5 (Main Dining)',
    itemCount: 5,
    paymentMethod: 'Card',
    paymentStatus: 'paid',
    amount: 4100,
    tax: 205.0,
  },
  {
    id: 'ord-107',
    orderNumber: 'PX-9015',
    date: '2026-09-25 13:20',
    type: 'delivery',
    identifier: 'Rohan Mehra (Worli)',
    itemCount: 2,
    paymentMethod: 'Online',
    paymentStatus: 'paid',
    amount: 1450,
    tax: 72.5,
  },
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-1',
    user_name: 'Marco Vance',
    user_role: 'waiter',
    action: 'TRANSMIT_KOT',
    entity: 'Order #PX-9021',
    details: 'Sent 4 items to Kitchen KDS for Table 4 with modifier: Extra Spicy',
    created_at: '2026-09-25 21:16:10',
  },
  {
    id: 'aud-2',
    user_name: 'Chef Jean-Luc',
    user_role: 'chef',
    action: 'STATUS_UPDATE',
    entity: 'Order #PX-9020',
    details: 'Marked order items READY for serving on Table 8',
    created_at: '2026-09-25 20:55:04',
  },
  {
    id: 'aud-3',
    user_name: 'Elena Rostova',
    user_role: 'receptionist',
    action: 'TABLE_SEATED',
    entity: 'Table 4 (VIP Lounge)',
    details: 'Seated walk-in party of 4 (Host: Roy)',
    created_at: '2026-09-25 20:42:15',
  },
  {
    id: 'aud-4',
    user_name: 'Alexander Wright',
    user_role: 'owner',
    action: 'STOCK_ADJUSTMENT',
    entity: 'Truffle Oil (White)',
    details: 'Added +2.0 ltr (Invoice PO-9921 from Milano Gourmet)',
    created_at: '2026-09-25 17:30:00',
  },
  {
    id: 'aud-5',
    user_name: 'Sarah Jenkins',
    user_role: 'admin',
    action: 'COUPON_CREATED',
    entity: 'Coupon LUXURY20',
    details: 'Published 20% discount coupon for bills above ₹1500',
    created_at: '2026-09-25 15:10:22',
  },
];

export default function AdminReports() {
  const [activeSubTab, setActiveSubTab] = useState<'financials' | 'audit'>('financials');
  const [selectedRange, setSelectedRange] = useState('Today');
  const [channelFilter, setChannelFilter] = useState<'all' | 'dine_in' | 'takeaway' | 'delivery'>('all');

  // Filtered Ledger
  const filteredLedger = useMemo(() => {
    return INITIAL_SALES_LEDGER.filter((row) => {
      if (channelFilter === 'all') return true;
      return row.type === channelFilter;
    });
  }, [channelFilter]);

  // Aggregate Stats
  const metrics = useMemo(() => {
    const gross = filteredLedger.reduce((sum, r) => sum + r.amount, 0);
    const tax = filteredLedger.reduce((sum, r) => sum + r.tax, 0);
    const net = gross - tax;
    const ordersCount = filteredLedger.length;
    const aov = ordersCount > 0 ? Math.round(gross / ordersCount) : 0;

    const dineInSales = filteredLedger.filter((r) => r.type === 'dine_in').reduce((s, r) => s + r.amount, 0);
    const deliverySales = filteredLedger.filter((r) => r.type === 'delivery').reduce((s, r) => s + r.amount, 0);
    const takeawaySales = filteredLedger.filter((r) => r.type === 'takeaway').reduce((s, r) => s + r.amount, 0);

    return { gross, tax, net, ordersCount, aov, dineInSales, deliverySales, takeawaySales };
  }, [filteredLedger]);

  // CSV Exporter
  function downloadCSV() {
    const headers = ['Order Number', 'Date', 'Type', 'Table / Customer', 'Items Count', 'Payment Method', 'Amount (INR)', 'Tax (INR)'];
    const rows = filteredLedger.map((r) => [
      r.orderNumber,
      `"${r.date}"`,
      r.type,
      `"${r.identifier}"`,
      r.itemCount,
      r.paymentMethod,
      r.amount,
      r.tax,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PRATHOMIX_Sales_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[#EAE6DF] tracking-wide"
            style={{ fontFamily: 'Cinzel, serif' }}>
            Financial Intelligence & Audit Ledger
          </h1>
          <p className="text-xs text-[#EAE6DF]/60 mt-1">
            Real-time revenue metrics, multi-channel sales distribution, GST tax analytics & cryptographic audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Subtab Switcher */}
          <div className="flex rounded-xl bg-[#1A1A1A] p-1 border border-[#C5A880]/15">
            <button
              onClick={() => setActiveSubTab('financials')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'financials'
                  ? 'bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A]'
                  : 'text-[#EAE6DF]/60 hover:text-[#EAE6DF]'
              }`}>
              Financials
            </button>
            <button
              onClick={() => setActiveSubTab('audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'audit'
                  ? 'bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A]'
                  : 'text-[#EAE6DF]/60 hover:text-[#EAE6DF]'
              }`}>
              Audit Trail
            </button>
          </div>

          {activeSubTab === 'financials' && (
            <button
              onClick={downloadCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/30 text-[#C5A880] hover:bg-[#C5A880]/10 text-xs font-bold transition-colors">
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {activeSubTab === 'financials' ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/25 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#EAE6DF]/60 uppercase tracking-wider font-semibold">Gross Revenue</span>
                <div className="w-8 h-8 rounded-lg bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880]">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#C5A880] mt-2 font-mono">
                ₹{metrics.gross.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">+18.4% vs last period</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#EAE6DF]/60 uppercase tracking-wider font-semibold">Net Income</span>
                <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#EAE6DF] mt-2 font-mono">
                ₹{metrics.net.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-[#EAE6DF]/50 mt-1">Excludes 5% GST tax</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#EAE6DF]/60 uppercase tracking-wider font-semibold">Orders Executed</span>
                <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#EAE6DF] mt-2 font-mono">{metrics.ordersCount}</div>
              <span className="text-[10px] text-emerald-400 mt-1">100% fulfillment rate</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#EAE6DF]/60 uppercase tracking-wider font-semibold">Average Ticket (AOV)</span>
                <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
                  <Utensils className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#C5A880] mt-2 font-mono">
                ₹{metrics.aov.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-[#EAE6DF]/50 mt-1">Per transaction ticket</span>
            </div>
          </div>

          {/* Channel Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Utensils className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] text-[#EAE6DF]/60 uppercase tracking-wider font-semibold">Dine-In Salon</span>
                <div className="text-lg font-bold text-[#EAE6DF] font-mono">
                  ₹{metrics.dineInSales.toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-[#C5A880]">
                  {metrics.gross > 0 ? Math.round((metrics.dineInSales / metrics.gross) * 100) : 0}% of total volume
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Bike className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] text-[#EAE6DF]/60 uppercase tracking-wider font-semibold">Direct Delivery</span>
                <div className="text-lg font-bold text-[#EAE6DF] font-mono">
                  ₹{metrics.deliverySales.toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-blue-400">
                  {metrics.gross > 0 ? Math.round((metrics.deliverySales / metrics.gross) * 100) : 0}% of total volume
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] text-[#EAE6DF]/60 uppercase tracking-wider font-semibold">Takeaway Counters</span>
                <div className="text-lg font-bold text-[#EAE6DF] font-mono">
                  ₹{metrics.takeawaySales.toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-emerald-400">
                  {metrics.gross > 0 ? Math.round((metrics.takeawaySales / metrics.gross) * 100) : 0}% of total volume
                </span>
              </div>
            </div>
          </div>

          {/* Channel Filter & Ledger Table */}
          <div className="rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 overflow-hidden">
            <div className="p-4 border-b border-[#C5A880]/15 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#EAE6DF] tracking-wide" style={{ fontFamily: 'Cinzel, serif' }}>
                Itemized Sales Register
              </h2>
              <div className="flex items-center gap-1.5">
                {(['all', 'dine_in', 'takeaway', 'delivery'] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setChannelFilter(ch)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                      channelFilter === ch
                        ? 'bg-[#C5A880] text-[#0A0A0A]'
                        : 'bg-[#1A1A1A] text-[#EAE6DF]/60 hover:text-[#EAE6DF]'
                    }`}>
                    {ch.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#C5A880]/15 bg-[#181818] text-[#C5A880] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Order Ref</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Floor / Guest Destination</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">GST (5%)</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C5A880]/10">
                  {filteredLedger.map((row) => (
                    <tr key={row.id} className="hover:bg-[#1A1A1A]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#C5A880]">{row.orderNumber}</td>
                      <td className="py-3.5 px-4 text-[#EAE6DF]/70">{row.date}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#2A2A2A] text-[#EAE6DF]">
                          {row.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#EAE6DF]">{row.identifier}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          {row.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#EAE6DF]/70">₹{row.tax.toFixed(2)}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#EAE6DF] text-right">
                        ₹{row.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Audit Trail Tab */
        <div className="rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 overflow-hidden">
          <div className="p-4 border-b border-[#C5A880]/15 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#EAE6DF] tracking-wide" style={{ fontFamily: 'Cinzel, serif' }}>
              System Action Traceability & Accountability Log
            </h2>
            <span className="text-xs text-[#C5A880] font-mono">Immutable Log Stream</span>
          </div>

          <div className="divide-y divide-[#C5A880]/10">
            {INITIAL_AUDIT_LOGS.map((log) => (
              <div key={log.id} className="p-4 hover:bg-[#1A1A1A]/60 transition-colors flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-[#C5A880]/10 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880] shrink-0 mt-0.5">
                  <ScrollText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs text-[#EAE6DF]">{log.user_name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#2A2A2A] text-[#C5A880]">
                      {log.user_role}
                    </span>
                    <span className="text-xs text-[#EAE6DF]/60">performed</span>
                    <span className="font-mono text-xs font-bold text-amber-400">{log.action}</span>
                    <span className="text-xs text-[#EAE6DF]/60">on</span>
                    <span className="text-xs text-[#EAE6DF] font-semibold">{log.entity}</span>
                  </div>
                  <p className="text-xs text-[#EAE6DF]/75 mt-1">{log.details}</p>
                </div>
                <div className="text-[11px] text-[#EAE6DF]/40 font-mono shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {log.created_at}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
