'use client';

import Image from 'next/image';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Table as TableIcon,
  Package,
  Users,
  HeartHandshake,
  Tag,
  BarChart3,
  ScrollText,
  Settings,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { clearClientSession } from '@/lib/auth';

export type AdminTab =
  | 'overview'
  | 'menu'
  | 'tables'
  | 'inventory'
  | 'staff'
  | 'crm'
  | 'coupons'
  | 'reports'
  | 'audit'
  | 'settings';

interface Props {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  restaurantName: string;
  userName: string;
  userRole: string;
}

const NAV_ITEMS: Array<{ id: AdminTab; label: string; icon: any }> = [
  { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
  { id: 'menu', label: 'Menu & Dishes', icon: UtensilsCrossed },
  { id: 'tables', label: 'Tables & QR Codes', icon: TableIcon },
  { id: 'inventory', label: 'Inventory & Stock', icon: Package },
  { id: 'staff', label: 'Staff & Roles', icon: Users },
  { id: 'crm', label: 'Customer CRM', icon: HeartHandshake },
  { id: 'coupons', label: 'Coupons & Offers', icon: Tag },
  { id: 'reports', label: 'Reports & Export', icon: BarChart3 },
  { id: 'audit', label: 'Audit Trail', icon: ScrollText },
  { id: 'settings', label: 'Restaurant Settings', icon: Settings },
];

export default function AdminSidebar({
  activeTab,
  onTabChange,
  restaurantName,
  userName,
  userRole,
}: Props) {
  function handleLogout() {
    clearClientSession();
    window.location.href = '/login';
  }

  return (
    <aside className="w-full lg:w-64 bg-[#121212] border-r border-[#C5A880]/15 flex flex-col h-full lg:h-screen lg:sticky lg:top-0 z-30">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-[#C5A880]/15 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0A0A0A] border border-[#C5A880]/40 flex items-center justify-center overflow-hidden p-1 shadow-warm flex-shrink-0">
          <Image
            src="/logo.png"
            alt="PRATHOMIX"
            width={36}
            height={36}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="min-w-0">
          <h2
            className="font-display font-bold text-sm text-[#EAE6DF] tracking-wider truncate"
            style={{ fontFamily: 'Cinzel, serif' }}>
            {restaurantName || 'PRATHOMIX OS'}
          </h2>
          <span className="text-[10px] text-[#C5A880] font-semibold uppercase tracking-widest block">
            {userRole || 'Admin'} Command
          </span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-1 scrollbar-none pb-safe">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const tourId =
            item.id === 'overview'
              ? 'admin-dashboard'
              : item.id === 'menu'
              ? 'admin-menu'
              : item.id === 'tables'
              ? 'admin-tables'
              : item.id === 'inventory'
              ? 'admin-inventory'
              : item.id === 'staff'
              ? 'admin-staff'
              : item.id === 'reports'
              ? 'admin-analytics'
              : item.id === 'audit'
              ? 'admin-security'
              : item.id === 'settings'
              ? 'admin-settings'
              : undefined;

          return (
            <button
              key={item.id}
              data-tour={tourId}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[40px] sm:min-h-[42px] rounded-xl text-xs font-semibold tracking-wide transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold shadow-md'
                  : 'text-[#EAE6DF]/70 hover:text-[#EAE6DF] hover:bg-[#1A1A1A]'
              }`}>
              <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#0A0A0A]' : 'text-[#C5A880]'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-[#C5A880]/15 bg-[#0E0E0E] flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#EAE6DF] truncate">{userName || 'Administrator'}</p>
          <p className="text-[10px] text-[#EAE6DF]/50 capitalize truncate">{userRole || 'Owner'}</p>
        </div>
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="w-8 h-8 rounded-lg bg-[#1A1A1A] border border-[#C5A880]/20 hover:border-rose-500/50 flex items-center justify-center text-[#EAE6DF]/60 hover:text-rose-400 transition-colors">
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
