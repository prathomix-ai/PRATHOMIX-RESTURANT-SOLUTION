'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScrollText,
  ShieldAlert,
  LogIn,
  LogOut,
  UtensilsCrossed,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  RefreshCw,
  User,
  Shield,
  Laptop,
  Smartphone,
  Eye,
  Lock,
} from 'lucide-react';
import { getClientSession } from '@/lib/auth';

interface AuditItem {
  id: string;
  who: string;
  role: string;
  action: string;
  category: 'auth' | 'operational' | 'security';
  details: string;
  timestamp: string;
  status: 'success' | 'warning' | 'alert';
  device?: string;
  isOwnerPrivate?: boolean;
}

export default function AdminAuditTrail() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'auth' | 'operational' | 'security'>('all');
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Live operational staff presence
  const [staffPresence, setStaffPresence] = useState<Array<{ name: string; role: string; lastSeen: string; isOnline: boolean }>>([
    { name: 'Rahul Sharma', role: 'waiter', lastSeen: 'Active now', isOnline: true },
    { name: 'Aman Verma', role: 'chef', lastSeen: 'Active now', isOnline: true },
    { name: 'Priya Nair', role: 'receptionist', lastSeen: 'Active now', isOnline: true },
    { name: 'Admin Ops', role: 'admin', lastSeen: 'Active now', isOnline: true },
  ]);

  // Activity events
  const [logs, setLogs] = useState<AuditItem[]>([
    {
      id: 'log-1',
      who: 'Rahul (Waiter)',
      role: 'waiter',
      action: 'ORDER_SERVED',
      category: 'operational',
      details: 'Marked Order #1042 (Table 12) as Served',
      timestamp: 'Today, 2:15 PM',
      status: 'success',
      device: 'Handheld POS',
    },
    {
      id: 'log-2',
      who: 'Aman (Chef)',
      role: 'chef',
      action: 'ORDER_READY',
      category: 'operational',
      details: 'Marked Order #1042 ready on Kitchen Display · Notified Rahul (Waiter)',
      timestamp: 'Today, 2:08 PM',
      status: 'success',
      device: 'Kitchen KDS Display',
    },
    {
      id: 'log-3',
      who: 'Priya (Receptionist)',
      role: 'receptionist',
      action: 'TABLE_ASSIGNED',
      category: 'operational',
      details: 'Assigned Table 12 to Walk-In Party of 4',
      timestamp: 'Today, 1:52 PM',
      status: 'success',
      device: 'Reception Terminal',
    },
    {
      id: 'log-4',
      who: 'Admin Ops',
      role: 'admin',
      action: 'LOGIN_SUCCESS',
      category: 'auth',
      details: 'Authenticated to Admin Portal',
      timestamp: 'Today, 1:45 PM',
      status: 'success',
      device: 'Chrome / Windows',
    },
    {
      id: 'log-5',
      who: 'Priya (Receptionist)',
      role: 'receptionist',
      action: 'LOGIN_SUCCESS',
      category: 'auth',
      details: 'Logged in to Concierge Station',
      timestamp: 'Today, 1:30 PM',
      status: 'success',
      device: 'Tablet / Safari',
    },
    {
      id: 'log-6',
      who: 'Aman (Chef)',
      role: 'chef',
      action: 'LOGIN_SUCCESS',
      category: 'auth',
      details: 'Station 1 KDS session started',
      timestamp: 'Today, 1:15 PM',
      status: 'success',
      device: 'Kitchen Station',
    },
    {
      id: 'log-7',
      who: 'Rahul (Waiter)',
      role: 'waiter',
      action: 'LOGIN_SUCCESS',
      category: 'auth',
      details: 'Logged into Section Terrace Garden',
      timestamp: 'Today, 1:10 PM',
      status: 'success',
      device: 'Mobile Handheld',
    },
    {
      id: 'log-8',
      who: 'Admin Ops',
      role: 'admin',
      action: 'MENU_PRICE_CHANGED',
      category: 'operational',
      details: 'Updated price of Truffle Butter Chicken (₹650 → ₹680)',
      timestamp: 'Today, 11:20 AM',
      status: 'warning',
      device: 'Admin Portal',
    },
    {
      id: 'log-9',
      who: 'System Security',
      role: 'system',
      action: 'LOGIN_FAILED',
      category: 'security',
      details: 'Invalid PIN attempt blocked for Waiter terminal (IP: 192.168.1.104)',
      timestamp: 'Today, 10:14 AM',
      status: 'alert',
      device: 'Unknown Device',
    },
    {
      id: 'log-10',
      who: 'Owner Executive',
      role: 'owner',
      action: 'TAX_POLICY_UPDATED',
      category: 'operational',
      details: 'Adjusted GST policy and Service Charge parameters',
      timestamp: 'Yesterday, 8:40 PM',
      status: 'warning',
      device: 'Owner Portal',
      isOwnerPrivate: true,
    },
    {
      id: 'log-11',
      who: 'Owner Executive',
      role: 'owner',
      action: 'SECURITY_2FA_ENABLED',
      category: 'security',
      details: 'Updated master multi-factor security credentials',
      timestamp: 'Yesterday, 6:00 PM',
      status: 'success',
      device: 'Owner Portal',
      isOwnerPrivate: true,
    },
  ]);

  useEffect(() => {
    const user = getClientSession();
    setCurrentUser(user);
    const effectiveRole = user?.role || 'admin';

    // Fetch live logs if available
    fetch(`/api/auth/activity?role=${effectiveRole}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.records && data.records.length > 0) {
          const mapped: AuditItem[] = data.records.map((a: any) => ({
            id: a.id,
            who: `${a.user} (${a.role})`,
            role: a.role.toLowerCase(),
            action: a.event.toUpperCase().replace(/\s+/g, '_'),
            category: 'auth',
            details: `${a.user} - ${a.event} on ${a.device || 'terminal'}`,
            timestamp: `${a.date}, ${a.time}`,
            status: a.status === 'Failed' ? 'alert' : 'success',
            device: a.device || 'Web Terminal',
            isOwnerPrivate: a.isOwnerPrivate || false,
          }));
          setLogs((prev) => [...mapped, ...prev]);
        }
      })
      .catch(() => {});
  }, [refreshKey]);

  const isOwner = currentUser?.role === 'owner';

  // Strict Role Privacy Filter:
  // Admin CANNOT see Owner private events or browsing.
  // Owner CAN see everything.
  const visibleLogs = useMemo(() => {
    return logs.filter((log) => {
      if (!isOwner && log.isOwnerPrivate) return false;
      if (!isOwner && log.role === 'owner') return false;
      if (filter === 'all') return true;
      return log.category === filter;
    });
  }, [logs, isOwner, filter]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl font-bold text-[#EAE6DF] tracking-wide"
              style={{ fontFamily: 'Cinzel, serif' }}>
              {isOwner ? 'Executive Audit Trail & Governance' : 'Staff Activity & Operations Audit'}
            </h1>
            <span className="text-[10px] bg-[#C5A880]/15 text-[#C5A880] border border-[#C5A880]/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {isOwner ? 'Level 1: Full Audit' : 'Staff Operations'}
            </span>
          </div>
          <p className="text-xs text-[#EAE6DF]/60 mt-1">
            {isOwner
              ? 'Comprehensive immutable audit record of authentication, menu, staff, and financial actions across the restaurant.'
              : 'Operational audit of staff shifts, table modifications, and food preparation events.'}
          </p>
        </div>

        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#C5A880] text-xs font-semibold hover:border-[#C5A880] transition-colors self-start sm:self-auto">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Trail
        </button>
      </div>

      {/* Security Governance Notice */}
      <div className="p-3.5 rounded-xl bg-[#121212]/90 border border-[#C5A880]/15 flex items-center justify-between text-xs text-[#EAE6DF]/70">
        <div className="flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-[#C5A880]" />
          <span>
            {isOwner
              ? 'Executive level visibility: Authentication logs, operational events, and system security actions.'
              : 'Administrative staff operations audit: Waiter, chef, and reception events. Owner private browsing is excluded.'}
          </span>
        </div>
        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#C5A880]/10 text-[#C5A880] border border-[#C5A880]/20 hidden sm:inline">
          {isOwner ? 'Full Audit Enabled' : 'Staff Level'}
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#C5A880]/15 pb-3 overflow-x-auto scrollbar-none">
        {(
          [
            { id: 'all', label: 'All Events', count: visibleLogs.length },
            { id: 'auth', label: 'Authentication & Shifts', count: visibleLogs.filter((l) => l.category === 'auth').length },
            { id: 'operational', label: 'Kitchen & Floor Operations', count: visibleLogs.filter((l) => l.category === 'operational').length },
            { id: 'security', label: 'Security & Access Alerts', count: visibleLogs.filter((l) => l.category === 'security').length },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wider transition-all whitespace-nowrap ${
              filter === tab.id
                ? 'bg-[#C5A880] text-[#0A0A0A] font-bold shadow-warm'
                : 'bg-[#1A1A1A] text-[#EAE6DF]/70 hover:text-[#C5A880] border border-[#C5A880]/10'
            }`}>
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                filter === tab.id ? 'bg-[#0A0A0A]/20 text-[#0A0A0A]' : 'bg-[#121212] text-[#EAE6DF]/50'
              }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Event Timeline / Table */}
      <div className="rounded-2xl bg-[#121212]/90 border border-[#C5A880]/20 overflow-hidden shadow-xl">
        <div className="divide-y divide-[#C5A880]/10">
          {visibleLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#EAE6DF]/50">
              No audit records match the selected filter.
            </div>
          ) : (
            visibleLogs.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-[#1A1A1A]/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                      item.status === 'alert'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : item.status === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}>
                    {item.category === 'auth' ? (
                      <LogIn className="w-4 h-4" />
                    ) : item.category === 'security' ? (
                      <ShieldAlert className="w-4 h-4" />
                    ) : (
                      <UtensilsCrossed className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#EAE6DF]">{item.who}</span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#1A1A1A] border border-[#C5A880]/20 text-[#C5A880]">
                        {item.action}
                      </span>
                      {item.isOwnerPrivate && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300">
                          Owner Protected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#EAE6DF]/80 mt-1 leading-relaxed">{item.details}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#EAE6DF]/40">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#C5A880]" />
                        {item.timestamp}
                      </span>
                      {item.device && (
                        <span className="flex items-center gap-1">
                          <Laptop className="w-3 h-3 text-[#EAE6DF]/50" />
                          {item.device}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="self-end sm:self-center flex-shrink-0">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                      item.status === 'alert'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : item.status === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
