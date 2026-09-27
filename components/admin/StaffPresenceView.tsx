'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  RefreshCw,
  Filter,
  CheckCircle2,
  Clock,
  Shield,
  UtensilsCrossed,
  ChefHat,
  Table as TableIcon,
  Search,
} from 'lucide-react';
import { getClientSession } from '@/lib/auth';

interface StaffPresenceRecord {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'away' | 'inactive';
  lastActivityText: string;
  lastSeen: string;
}

interface Props {
  role?: string;
  compact?: boolean;
}

export default function StaffPresenceView({ role: propRole, compact = false }: Props) {
  const [presenceList, setPresenceList] = useState<StaffPresenceRecord[]>([]);
  const [counts, setCounts] = useState({ active: 0, away: 0, inactive: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewer, setViewer] = useState<string>('admin');

  const fetchPresence = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const user = getClientSession();
      const currentRole = propRole || user?.role || 'admin';

      const res = await fetch(`/api/presence?role=${currentRole}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.presence) {
          setPresenceList(data.presence);
          if (data.counts) setCounts(data.counts);
          if (data.viewer) setViewer(data.viewer);
        }
      }
    } catch {
      // ignore network glitch
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPresence();
    // Gentle polling every 10 seconds only when tab is active
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      fetchPresence();
    }, 10000);

    return () => clearInterval(interval);
  }, [propRole]);

  // Filter staff by status, role, and search
  const filteredStaff = useMemo(() => {
    return presenceList.filter((staff) => {
      // Status filter
      if (statusFilter === 'active' && staff.status === 'inactive') return false;
      if (statusFilter === 'inactive' && staff.status !== 'inactive') return false;

      // Role filter
      if (roleFilter !== 'all' && staff.role.toLowerCase() !== roleFilter.toLowerCase()) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          staff.name.toLowerCase().includes(q) ||
          staff.role.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [presenceList, statusFilter, roleFilter, searchQuery]);

  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'waiter':
        return UtensilsCrossed;
      case 'chef':
        return ChefHat;
      case 'receptionist':
      case 'reception':
        return TableIcon;
      default:
        return Shield;
    }
  };

  return (
    <div className="rounded-2xl bg-[#121212]/95 border border-[#C5A880]/20 p-5 space-y-4 shadow-xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#C5A880]/15">
        <div>
          <div className="flex items-center gap-2.5">
            <h2
              className="text-base sm:text-lg font-bold text-[#EAE6DF] tracking-wide"
              style={{ fontFamily: 'Cinzel, serif' }}>
              STAFF ACTIVE PRESENCE
            </h2>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Pulse
            </span>
          </div>
          <p className="text-xs text-[#EAE6DF]/60 mt-0.5">
            Real-time terminal heartbeats · Updates automatically every 6 seconds
          </p>
        </div>

        {/* Counts Badges & Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A1A1A] border border-emerald-500/30 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[#EAE6DF]/70 font-semibold">ACTIVE:</span>
            <span className="font-bold text-emerald-400">{counts.active}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#EAE6DF]/40" />
            <span className="text-[#EAE6DF]/70 font-semibold">INACTIVE:</span>
            <span className="font-bold text-[#EAE6DF]/60">{counts.inactive}</span>
          </div>

          <button
            onClick={() => fetchPresence(true)}
            disabled={refreshing}
            title="Poll Current Presence"
            className="p-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 hover:border-[#C5A880] text-[#C5A880] transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {(
            [
              { id: 'all', label: 'All Staff', count: presenceList.length },
              { id: 'active', label: '🟢 Active', count: counts.active },
              { id: 'inactive', label: '⚫ Inactive', count: counts.inactive },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wider transition-all whitespace-nowrap ${
                statusFilter === s.id
                  ? 'bg-[#C5A880] text-[#0A0A0A] font-bold shadow-warm'
                  : 'bg-[#1A1A1A] text-[#EAE6DF]/70 hover:text-[#C5A880] border border-[#C5A880]/15'
              }`}>
              <span>{s.label}</span>
              <span
                className={`text-[10px] px-1.5 rounded-full ${
                  statusFilter === s.id ? 'bg-[#0A0A0A]/20 text-[#0A0A0A]' : 'bg-[#121212] text-[#EAE6DF]/50'
                }`}>
                {s.count}
              </span>
            </button>
          ))}
        </div>

        {/* Role Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-[#EAE6DF]/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-xs text-[#EAE6DF] placeholder:text-[#EAE6DF]/30 focus:outline-none focus:border-[#C5A880]"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-xs text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]">
            <option value="all">All Roles</option>
            <option value="waiter">Waiters</option>
            <option value="chef">Chefs</option>
            <option value="receptionist">Reception</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Staff Status Grid */}
      {loading ? (
        <div className="p-8 text-center text-xs text-[#EAE6DF]/50">
          <RefreshCw className="w-4 h-4 animate-spin text-[#C5A880] mx-auto mb-2" />
          Synchronizing staff presence...
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="p-8 text-center text-xs text-[#EAE6DF]/50 border border-[#C5A880]/10 rounded-xl bg-[#1A1A1A]/40">
          No staff members match the selected status or role filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <AnimatePresence>
            {filteredStaff.map((staff) => {
              const RoleIcon = getRoleIcon(staff.role);
              const isActive = staff.status === 'active';
              const isAway = staff.status === 'away';

              return (
                <motion.div
                  key={staff.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-[#181818] border-emerald-500/30 hover:border-emerald-500/50 shadow-sm'
                      : isAway
                        ? 'bg-[#181818] border-amber-500/30 hover:border-amber-500/50'
                        : 'bg-[#141414] border-[#C5A880]/10 opacity-75 hover:opacity-100'
                  }`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : isAway
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-[#222] text-[#EAE6DF]/40 border border-white/5'
                        }`}>
                        <RoleIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#EAE6DF] truncate">{staff.name}</div>
                        <div className="text-[10px] text-[#C5A880] uppercase tracking-wider font-semibold capitalize">
                          {staff.role}
                        </div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex-shrink-0 ${
                        isActive
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : isAway
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                            : 'bg-[#222] border-white/10 text-[#EAE6DF]/40'
                      }`}>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActive ? 'bg-emerald-400' : isAway ? 'bg-amber-400' : 'bg-stone-500'
                        }`}
                      />
                      <span>{isActive ? 'Active' : isAway ? 'Away' : 'Inactive'}</span>
                    </span>
                  </div>

                  {/* Activity Details */}
                  <div className="pt-2 border-t border-white/5 text-[11px] text-[#EAE6DF]/60 flex items-center justify-between">
                    <span className="truncate">{staff.lastActivityText}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
