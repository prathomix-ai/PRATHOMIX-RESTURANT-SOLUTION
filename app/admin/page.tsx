'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu as MenuIcon,
  X,
  Bell,
  Sparkles,
  Shield,
  LogOut,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

import { getClientSession, clearClientSession, type AuthUser } from '@/lib/auth';
import {
  supabase,
  RESTAURANT_TABLES,
  RESTAURANT_SEED_DISHES,
  type Order,
  type Dish,
  type InventoryItem,
} from '@/lib/supabase';
import AdminSidebar, { type AdminTab } from '@/components/admin/AdminSidebar';
import AdminOverview from '@/components/admin/AdminOverview';
import AdminMenu from '@/components/admin/AdminMenu';
import AdminTables from '@/components/admin/AdminTables';
import AdminInventory from '@/components/admin/AdminInventory';
import AdminStaff from '@/components/admin/AdminStaff';
import AdminCRM from '@/components/admin/AdminCRM';
import AdminCoupons from '@/components/admin/AdminCoupons';
import AdminReports from '@/components/admin/AdminReports';
import AdminSettings from '@/components/admin/AdminSettings';

function AdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as AdminTab) || 'overview';

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Shared Data States
  const [orders, setOrders] = useState<Order[]>([]);
  const [dishes, setDishes] = useState<Dish[]>(RESTAURANT_SEED_DISHES);
  const [tables, setTables] = useState<any[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [bookingsCount, setBookingsCount] = useState(6);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [orderRes, dishRes, tableRes] = await Promise.all([
        supabase.from(RESTAURANT_TABLES.orders).select('*').order('created_at', { ascending: false }),
        supabase.from(RESTAURANT_TABLES.dishes).select('*').order('name', { ascending: true }),
        supabase.from(RESTAURANT_TABLES.restaurantTables).select('*').order('table_number', { ascending: true }),
      ]);

      if (orderRes.data && orderRes.data.length > 0) {
        setOrders(orderRes.data);
      }
      if (dishRes.data && dishRes.data.length > 0) {
        setDishes(dishRes.data);
      }
      if (tableRes.data && tableRes.data.length > 0) {
        setTables(tableRes.data);
      } else {
        // Fallback default tables 1-10
        const defaultTables = Array.from({ length: 10 }, (_, i) => ({
          id: `tbl-${i + 1}`,
          table_number: i + 1,
          capacity: i < 2 ? 2 : i > 7 ? 8 : 4,
          section: i < 4 ? 'Terrace Garden' : i > 7 ? 'VIP Lounge' : 'Main Dining',
          status: 'available',
        }));
        setTables(defaultTables);
      }
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const user = getClientSession();
    if (!user) {
      // In development, default to Master Owner demo session if not set
      const defaultOwner: AuthUser = {
        id: 'owner-default',
        restaurant_id: '10000000-0000-0000-0000-000000000001',
        role: 'owner',
        name: 'Alexander Wright',
        email: 'owner@prathomix.com',
        status: 'active',
      };
      setCurrentUser(defaultOwner);
    } else {
      // Check role authorization
      const allowedRoles = ['owner', 'admin', 'manager', 'accountant'];
      if (!allowedRoles.includes(user.role)) {
        router.push('/login?redirect=/admin');
        return;
      }
      setCurrentUser(user);
    }
    loadData().finally(() => setLoading(false));
  }, [router, loadData]);

  function handleTabChange(tab: AdminTab) {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.history.replaceState(null, '', `/admin?tab=${tab}`);
  }

  function handleLogout() {
    clearClientSession();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#C5A880]/30 border-t-[#C5A880] rounded-full animate-spin" />
          <span className="text-xs text-[#C5A880] font-mono tracking-widest uppercase">
            Initializing PRATHOMIX OS...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EAE6DF] flex">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block shrink-0">
        <AdminSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          restaurantName="PRATHOMIX Flagship"
          userName={currentUser?.name || 'Administrator'}
          userRole={currentUser?.role || 'owner'}
        />
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-72 bg-[#121212] z-10 shadow-2xl h-full flex flex-col">
              <div className="p-4 border-b border-[#C5A880]/15 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C5A880]" />
                  <span className="font-bold text-sm text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                    PRATHOMIX OS
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-[#EAE6DF]/60 hover:text-[#EAE6DF]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <AdminSidebar
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  restaurantName="PRATHOMIX Flagship"
                  userName={currentUser?.name || 'Administrator'}
                  userRole={currentUser?.role || 'owner'}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 px-4 sm:px-6 bg-[#121212]/90 backdrop-blur-xl border-b border-[#C5A880]/15 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/15 text-[#C5A880] lg:hidden">
              <MenuIcon className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-[#EAE6DF]/60 font-semibold hidden sm:inline">
                Flagship Lounge • Live Operations
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <button
              onClick={loadData}
              disabled={refreshing}
              title="Refresh Data"
              className="p-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#C5A880] hover:bg-[#C5A880]/10 transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Direct Links */}
            <Link
              href="/"
              target="_blank"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/15 text-[11px] text-[#C5A880] hover:bg-[#C5A880]/10 transition-colors">
              <ExternalLink className="w-3 h-3" />
              <span>Storefront</span>
            </Link>

            <Link
              href="/waiter/dashboard"
              className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-[#2A2A2A] text-[10px] text-[#EAE6DF]/80 hover:text-[#C5A880] transition-colors">
              Waiter POS
            </Link>

            <Link
              href="/kitchen/dashboard"
              className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-[#2A2A2A] text-[10px] text-[#EAE6DF]/80 hover:text-[#C5A880] transition-colors">
              Chef KDS
            </Link>

            {/* User Profile */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-[#C5A880]/15">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs flex items-center justify-center shadow-warm">
                {currentUser?.name?.charAt(0) || 'A'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-[#EAE6DF] leading-tight">
                  {currentUser?.name || 'Administrator'}
                </div>
                <div className="text-[10px] text-[#C5A880] uppercase tracking-wider font-semibold">
                  {currentUser?.role || 'owner'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {activeTab === 'overview' && (
            <AdminOverview
              orders={orders}
              dishes={dishes}
              inventory={inventory}
              bookingsCount={bookingsCount}
            />
          )}
          {activeTab === 'menu' && <AdminMenu dishes={dishes} onRefresh={loadData} />}
          {activeTab === 'tables' && <AdminTables tables={tables} onRefresh={loadData} />}
          {activeTab === 'inventory' && <AdminInventory />}
          {activeTab === 'staff' && <AdminStaff />}
          {activeTab === 'crm' && <AdminCRM />}
          {activeTab === 'coupons' && <AdminCoupons />}
          {activeTab === 'reports' && <AdminReports />}
          {activeTab === 'audit' && <AdminReports />}
          {activeTab === 'settings' && <AdminSettings />}
        </main>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-[#C5A880]/30 border-t-[#C5A880] rounded-full animate-spin" />
        </div>
      }>
      <AdminContent />
    </Suspense>
  );
}