import { supabase, DEFAULT_RESTAURANT_ID, type UserRole, type Profile } from './supabase';

export interface AuthUser {
  id: string;
  restaurant_id: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  employee_code?: string;
  status: 'active' | 'suspended' | 'inactive';
}

export const ROLE_REDIRECTS: Record<UserRole, string> = {
  owner: '/admin',
  admin: '/admin',
  manager: '/admin',
  receptionist: '/reception/dashboard',
  waiter: '/waiter/dashboard',
  chef: '/kitchen/dashboard',
  delivery: '/delivery/dashboard',
  customer: '/',
  accountant: '/admin',
};

// Default seed accounts for instant login & preview
export const DEMO_ACCOUNTS: Array<{
  email: string;
  passcode: string;
  role: UserRole;
  name: string;
  employee_code?: string;
}> = [
  { email: 'owner@prathomix.com', passcode: 'prathomix2024', role: 'owner', name: 'Master Restaurateur', employee_code: 'ADM-01' },
  { email: 'admin@prathomix.tech', passcode: 'prathomix2024', role: 'admin', name: 'Executive Admin', employee_code: 'ADM-02' },
  { email: 'reception@prathomix.com', passcode: 'reception2026', role: 'receptionist', name: 'Elena Rostova (Front Desk)', employee_code: 'REC-01' },
  { email: 'chef@prathomix.com', passcode: 'kitchen2026', role: 'chef', name: 'Chef Jean-Luc (Head Chef)', employee_code: 'CHF-01' },
  { email: 'waiter@prathomix.com', passcode: 'waiter2026', role: 'waiter', name: 'Marco Vance (Lead Server)', employee_code: 'W-1001' },
  { email: 'delivery@prathomix.com', passcode: 'delivery2026', role: 'delivery', name: 'Arjun Das (Fleet Specialist)', employee_code: 'DEL-01' },
  { email: 'customer@prathomix.com', passcode: 'customer2026', role: 'customer', name: 'Vikramaditya Roy' },
];

export function getClientSession(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('prathomix_user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setClientSession(user: AuthUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('prathomix_user', JSON.stringify(user));
  document.cookie = `prathomix_staff_role=${encodeURIComponent(user.role)}; path=/; max-age=604800; samesite=lax`;
  document.cookie = `prathomix_user_session=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=604800; samesite=lax`;
}

export function clearClientSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('prathomix_user');
  localStorage.removeItem('waiterName');
  localStorage.removeItem('waiterId');
  document.cookie = 'prathomix_staff_role=; path=/; max-age=0; samesite=lax';
  document.cookie = 'prathomix_user_session=; path=/; max-age=0; samesite=lax';
}
