'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import {
  AlertTriangle,
  BarChart2,
  BadgeDollarSign,
  Bike,
  CheckCircle2,
  Clock3,
  Copy,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  PlusCircle,
  ReceiptText,
  RefreshCw,
  Settings2,
  Shield,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

import { RESTAURANT_TABLES, supabase, type AttendanceRecord, type LeaveRequest, type StaffProfile } from '@/lib/supabase';

type Tab = 'analytics' | 'inventory' | 'financials' | 'staff-management';
type StaffRole = 'reception' | 'kitchen';

type ToastState = {
  type: 'success' | 'error';
  title: string;
  message: string;
} | null;

type StaffCard = {
  role: StaffRole;
  label: string;
  description: string;
};

const DEFAULT_ERROR = 'Incorrect password. Access denied.';
const STAFF_CARDS: StaffCard[] = [
  {
    role: 'reception',
    label: 'Reception',
    description: 'Controls bookings, table assignments, and front desk access.',
  },
  {
    role: 'kitchen',
    label: 'Kitchen',
    description: 'Controls the kitchen dashboard and live order workflow.',
  },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function startOfWeek(dateValue = new Date()) {
  const date = new Date(dateValue);
  const day = date.getDay();
  const offset = (day + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - offset);
  return date;
}

function startOfMonth(dateValue = new Date()) {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  date.setDate(1);
  return date;
}

function isWithinRange(dateValue: string | undefined, start: Date, end: Date) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  return !Number.isNaN(date.getTime()) && date >= start && date <= end;
}

function isSameDay(dateValue: string | undefined, compareTo: Date) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  return !Number.isNaN(date.getTime()) && date.toDateString() === compareTo.toDateString();
}

function formatDateTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function createWaiterCredentials() {
  const code = Math.floor(1000 + Math.random() * 9000);
  const pin = Math.floor(1000 + Math.random() * 9000);

  return {
    employeeCode: `W-${code}`,
    passcode: String(pin),
  };
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [pwErr, setPwErr] = useState('');
  const [tab, setTab] = useState<Tab>('analytics');
  const [analytics, setAnalytics] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [dishes, setDishes] = useState<any[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [aLoading, setALoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [promoLoadingId, setPromoLoadingId] = useState<string | null>(null);
  const [promoModal, setPromoModal] = useState<{ name: string; text: string } | null>(null);
  const [copiedPromo, setCopiedPromo] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffHiring, setStaffHiring] = useState(false);
  const [waiterForm, setWaiterForm] = useState(() => ({ name: '', role: 'Server', ...createWaiterCredentials() }));
  const [editingWaiter, setEditingWaiter] = useState<StaffProfile | null>(null);
  const [editWaiterForm, setEditWaiterForm] = useState({ name: '', passcode: '' });
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    calories: '',
    protein: '',
    image_url: '',
    category: 'Main',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [staffDrafts, setStaffDrafts] = useState<Record<StaffRole, string>>({
    reception: '',
    kitchen: '',
  });
  const [staffSavingRole, setStaffSavingRole] = useState<StaffRole | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: '',
    role: '',
    phone: '',
    salary: '',
  });
  const [toast, setToast] = useState<ToastState>(null);

  // Rider Fleet Management State
  const [riderForm, setRiderForm] = useState({
    name: '',
    phone: '',
    vehicleDetails: '',
    isActive: true,
  });
  const [riderHiring, setRiderHiring] = useState(false);
  const [editingRider, setEditingRider] = useState<StaffProfile | null>(null);
  const [editRiderForm, setEditRiderForm] = useState({
    name: '',
    phone: '',
    vehicleDetails: '',
    isActive: true,
  });

  useEffect(() => {
    if (typeof document !== 'undefined' && document.cookie.includes('prathomix_staff_role=admin')) {
      setAuthenticated(true);
    }
  }, []);

  async function handleLogin() {
    if (!pw.trim()) {
      setPwErr(DEFAULT_ERROR);
      return;
    }

    setAuthLoading(true);
    setPwErr('');

    try {
      const currentRole = window.location.pathname.split('/')[1];
      const { data, error } = await supabase.rpc('verify_staff_access', {
        p_code: pw,
        p_role: currentRole,
      });

      if (error) {
        throw error;
      }

      if (!data) {
        alert('Incorrect password');
        setPwErr(DEFAULT_ERROR);
        setPw('');
        return;
      }

      document.cookie = `prathomix_staff_role=${encodeURIComponent(currentRole)}; path=/; max-age=28800; samesite=lax`;
      window.location.href = `/${currentRole}/dashboard`;
      setPw('');
    } catch (error) {
      console.error(error);
      setPwErr(error instanceof Error ? error.message : DEFAULT_ERROR);
      setPw('');
    } finally {
      setAuthLoading(false);
    }
  }

  const loadData = useCallback(async () => {
    setALoading(true);
    try {
      const fetchJson = async <T,>(url: string): Promise<T> => {
        const response = await fetch(url);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || `Failed to load ${url}`);
        }

        return payload as T;
      };

      const staffQuery = supabase.from(RESTAURANT_TABLES.staffProfiles).select('*').order('created_at', { ascending: false });
      const attendanceQuery = supabase
        .from(RESTAURANT_TABLES.attendance)
        .select('*')
        .eq('attendance_date', getTodayDateValue())
        .order('created_at', { ascending: false });
      const leaveQuery = supabase
        .from(RESTAURANT_TABLES.leaveRequests)
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const [dRes, aRes, oRes, bRes, staffRes, attendanceRes, leaveRes] = await Promise.allSettled([
        fetchJson<any[]>('/api/dishes'),
        fetchJson<any>('/api/admin/analytics'),
        fetchJson<any[]>('/api/orders'),
        fetchJson<any[]>('/api/booking'),
        staffQuery,
        attendanceQuery,
        leaveQuery,
      ]);

      if (dRes.status === 'fulfilled') setDishes(dRes.value);
      if (aRes.status === 'fulfilled') setAnalytics(aRes.value);
      if (oRes.status === 'fulfilled') setOrders(oRes.value);
      if (bRes.status === 'fulfilled') setBookings(bRes.value);

      if (dRes.status === 'rejected' || aRes.status === 'rejected' || oRes.status === 'rejected' || bRes.status === 'rejected') {
        console.error('One or more admin datasets failed to load', {
          dishes: dRes.status === 'rejected' ? dRes.reason : null,
          analytics: aRes.status === 'rejected' ? aRes.reason : null,
          orders: oRes.status === 'rejected' ? oRes.reason : null,
          bookings: bRes.status === 'rejected' ? bRes.reason : null,
        });
      }

      if (staffRes.status === 'fulfilled') {
        const { data, error } = staffRes.value;

        if (error) {
          console.error('Failed to load staff profiles', error);
        } else {
          setStaffProfiles((data as StaffProfile[] | null) ?? []);
        }
      } else {
        console.error('Failed to load staff profiles', staffRes.reason);
      }

      if (attendanceRes.status === 'fulfilled') {
        const { data, error } = attendanceRes.value;

        if (error) {
          console.error('Failed to load attendance', error);
        } else {
          setAttendance((data as AttendanceRecord[] | null) ?? []);
        }
      }

      if (leaveRes.status === 'fulfilled') {
        const { data, error } = leaveRes.value;

        if (error) {
          console.error('Failed to load leave requests', error);
        } else {
          setLeaveRequests((data as LeaveRequest[] | null) ?? []);
        }
      }
    } catch (error) {
      console.error('Admin data load error:', error);
    } finally {
      setALoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) loadData();
  }, [authenticated, loadData]);

  const dishSales = useMemo(() => {
    const counts = new Map<string, number>();

    for (const order of orders) {
      for (const dishName of order?.dish_names ?? []) {
        const key = String(dishName).trim().toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    return dishes
      .map((dish) => ({
        ...dish,
        sales: counts.get(String(dish.name).trim().toLowerCase()) ?? 0,
      }))
      .sort((a, b) => a.sales - b.sales);
  }, [dishes, orders]);

  const lowPerformingDishIds = useMemo(() => {
    const sliceSize = Math.min(4, dishSales.length);
    return new Set(dishSales.slice(0, sliceSize).map((dish) => dish.id));
  }, [dishSales]);

  const completedOrders = useMemo(() => {
    return orders
      .filter((order) => String(order?.status ?? '').toLowerCase() === 'completed')
      .sort((a, b) => {
        const left = new Date(b?.created_at ?? 0).getTime();
        const right = new Date(a?.created_at ?? 0).getTime();
        return left - right;
      });
  }, [orders]);

  const completedBookings = useMemo(() => {
    return bookings.filter((booking) => String(booking?.status ?? '').toLowerCase() === 'completed');
  }, [bookings]);

  const financialSummary = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const revenueFrom = (items: any[], predicate: (item: any) => boolean) => {
      return items.reduce((sum, item) => sum + (predicate(item) ? Number(item?.total_amount ?? 0) : 0), 0);
    };

    return {
      dailyRevenue: revenueFrom(completedOrders, (order) => isSameDay(order?.created_at, now)),
      weeklyRevenue: revenueFrom(completedOrders, (order) => isWithinRange(order?.created_at, weekStart, now)),
      monthlyRevenue: revenueFrom(completedOrders, (order) => isWithinRange(order?.created_at, monthStart, monthEnd)),
      completedTransactions: completedOrders.length + completedBookings.length,
      recentTransactions: completedOrders.slice(0, 8),
      todayBookings: bookings.filter((booking) => isSameDay(booking?.created_at, now) || isSameDay(`${booking?.date ?? ''}T00:00:00`, now)).length,
    };
  }, [bookings, completedBookings.length, completedOrders]);

  const waiterProfiles = useMemo(() => staffProfiles.filter((staff) => staff.role === 'waiter'), [staffProfiles]);

  const categoryRevenue = useMemo(() => {
    const revs = new Map<string, number>();
    for (const order of orders) {
      const amount = Number(order?.total_amount ?? 0);
      for (const dName of order?.dish_names ?? []) {
        const dish = dishes.find((d) => String(d.name).toLowerCase() === String(dName).toLowerCase());
        const cat = dish?.category || 'Main';
        const count = order?.dish_names?.length || 1;
        const itemPrice = amount / count;
        revs.set(cat, (revs.get(cat) ?? 0) + itemPrice);
      }
    }
    return [
      { category: 'High Protein', revenue: Math.round(revs.get('High Protein') ?? 12500) },
      { category: 'Vegetarian', revenue: Math.round(revs.get('Vegetarian') ?? 8400) },
      { category: 'Low Cal', revenue: Math.round(revs.get('Low Cal') ?? 6200) },
      { category: 'Main', revenue: Math.round(revs.get('Main') ?? 19500) },
    ];
  }, [orders, dishes]);

  const deliveryVsDineIn = useMemo(() => {
    let dineInCount = 0;
    let deliveryCount = 0;
    let dineInRev = 0;
    let deliveryRev = 0;
    for (const order of orders) {
      const isDelivery = order?.table_number === 999;
      const rev = Number(order?.total_amount ?? 0);
      if (isDelivery) {
        deliveryCount++;
        deliveryRev += rev;
      } else {
        dineInCount++;
        dineInRev += rev;
      }
    }
    if (orders.length === 0) {
      dineInCount = 14;
      deliveryCount = 9;
      dineInRev = 6800;
      deliveryRev = 4200;
    }
    return { dineInCount, deliveryCount, dineInRev, deliveryRev };
  }, [orders]);

  const peakHours = useMemo(() => {
    const hours = { morning: 0, lunch: 0, evening: 0, dinner: 0 };
    for (const order of orders) {
      const date = new Date(order?.created_at);
      if (Number.isNaN(date.getTime())) continue;
      const h = date.getHours();
      if (h >= 8 && h < 12) hours.morning++;
      else if (h >= 12 && h < 16) hours.lunch++;
      else if (h >= 16 && h < 20) hours.evening++;
      else hours.dinner++;
    }
    if (orders.length === 0) {
      hours.morning = 5;
      hours.lunch = 24;
      hours.evening = 12;
      hours.dinner = 38;
    }
    return hours;
  }, [orders]);
  const todayAttendanceByStaffId = useMemo(() => {
    return new Map(attendance.map((record) => [record.staff_id, record]));
  }, [attendance]);
  const pendingLeaveByStaffId = useMemo(() => {
    return new Map(leaveRequests.map((request) => [request.staff_id, request]));
  }, [leaveRequests]);

  async function handleGeneratePromo(dish: any) {
    setPromoLoadingId(dish.id);
    try {
      const res = await fetch('/api/admin/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dishName: dish.name,
          dishDescription: dish.description,
          category: dish.category,
          price: dish.price,
        }),
      });
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload?.error || 'Unable to generate promo copy');
      }

      setPromoModal({ name: dish.name, text: payload.text });
      setCopiedPromo(false);
    } catch (error) {
      setPromoModal({
        name: dish.name,
        text: error instanceof Error ? error.message : 'Unable to generate promo copy',
      });
      setCopiedPromo(false);
    } finally {
      setPromoLoadingId(null);
    }
  }

  async function copyPromoText() {
    if (!promoModal?.text) return;
    await navigator.clipboard.writeText(promoModal.text);
    setCopiedPromo(true);
    window.setTimeout(() => setCopiedPromo(false), 1800);
  }

  async function addDish() {
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    try {
      const response = await fetch('/api/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price) || 0,
          calories: parseInt(form.calories) || 0,
          protein: parseFloat(form.protein) || 0,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to add dish');
      }

      setSaved(true);
      setForm({ name: '', description: '', price: '', calories: '', protein: '', image_url: '', category: 'Main' });
      setTimeout(() => setSaved(false), 2500);
      await loadData();
    } catch (error) {
      console.error('Add dish failed:', error);
    } finally {
      setSaving(false);
    }
  }

  async function updatePassword(role: StaffRole, newPass: string) {
    const nextPassword = newPass.trim();
    if (!nextPassword) {
      setToast({
        type: 'error',
        title: 'Password required',
        message: `Enter a new password for ${role === 'reception' ? 'Reception' : 'Kitchen'}.`,
      });
      return;
    }

    setStaffSavingRole(role);
    try {
      const { error } = await supabase
        .from('staff_access')
        .update({ passcode: nextPassword })
        .eq('role', role);

      if (error) {
        throw error;
      }

      setStaffDrafts((prev) => ({ ...prev, [role]: '' }));
      alert(`${role === 'reception' ? 'Reception' : 'Kitchen'} password updated.`);
      setToast({
        type: 'success',
        title: 'Password updated',
        message: `${role === 'reception' ? 'Reception' : 'Kitchen'} access was updated successfully.`,
      });

      window.setTimeout(() => setToast(null), 2500);
    } catch (error) {
      setToast({
        type: 'error',
        title: 'Update failed',
        message: error instanceof Error ? error.message : 'Unable to update staff access.',
      });
      window.setTimeout(() => setToast(null), 3000);
    } finally {
      setStaffSavingRole(null);
    }
  }

  async function hireStaff() {
    const name = staffForm.name.trim();
    const role = staffForm.role.trim();
    const phone = staffForm.phone.trim();
    const salary = Number(staffForm.salary);

    if (!name || !role || !phone || !Number.isFinite(salary) || salary <= 0) {
      setToast({
        type: 'error',
        title: 'Incomplete staff form',
        message: 'Enter a name, role, phone number, and salary before hiring staff.',
      });
      window.setTimeout(() => setToast(null), 3000);
      return;
    }

    setStaffHiring(true);
    try {
      const { data, error } = await supabase
        .from(RESTAURANT_TABLES.staffProfiles)
        .insert({ name, role, phone, salary })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setStaffProfiles((prev) => [data, ...prev]);
      }

      setStaffForm({ name: '', role: '', phone: '', salary: '' });
      setStaffModalOpen(false);
      setToast({
        type: 'success',
        title: 'Staff hired',
        message: `${name} was added to staff management successfully.`,
      });
      window.setTimeout(() => setToast(null), 2500);
    } catch (error) {
      setToast({
        type: 'error',
        title: 'Hire failed',
        message: error instanceof Error ? error.message : 'Unable to save the staff profile.',
      });
      window.setTimeout(() => setToast(null), 3000);
    } finally {
      setStaffHiring(false);
    }
  }

  async function hireWaiter() {
    const name = waiterForm.name.trim();
    const role = waiterForm.role.trim();
    const employeeCode = waiterForm.employeeCode.trim();
    const passcode = waiterForm.passcode.trim();

    if (!name || !role || !employeeCode || !passcode) {
      setToast({
        type: 'error',
        title: 'Name required',
        message: 'Enter a staff name and role before generating the profile.',
      });
      window.setTimeout(() => setToast(null), 3000);
      return;
    }

    setStaffHiring(true);
    try {
      const { data, error } = await supabase
        .from(RESTAURANT_TABLES.staffProfiles)
        .insert({
          employee_code: employeeCode,
          name,
          role,
          phone: 'N/A',
          salary: 0,
          passcode,
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setStaffProfiles((prev) => [data, ...prev]);
      }

      setWaiterForm({ name: '', role: 'Server', ...createWaiterCredentials() });
      setToast({
        type: 'success',
        title: 'Staff hired',
        message: `${name} was added with a unique employee code and passcode.`,
      });
      window.setTimeout(() => setToast(null), 2500);
      await loadData();
    } catch (error) {
      console.log('Save Error: ', error);
      setToast({
        type: 'error',
        title: 'Hire failed',
        message: error instanceof Error ? error.message : 'Unable to save the waiter profile.',
      });
      window.setTimeout(() => setToast(null), 3000);
    } finally {
      setStaffHiring(false);
    }
  }

  function startEditWaiter(waiter: StaffProfile) {
    setEditingWaiter(waiter);
    setEditWaiterForm({
      name: waiter.name ?? '',
      passcode: waiter.passcode ?? '',
    });
  }

  async function saveWaiterEdits() {
    if (!editingWaiter) return;

    try {
      const { error } = await supabase
        .from(RESTAURANT_TABLES.staffProfiles)
        .update({
          name: editWaiterForm.name.trim(),
          passcode: editWaiterForm.passcode.trim(),
        })
        .eq('id', editingWaiter.id);

      if (error) {
        throw error;
      }

      setEditingWaiter(null);
      await loadData();
    } catch (error) {
      console.log('Save Error: ', error);
      setToast({
        type: 'error',
        title: 'Update failed',
        message: error instanceof Error ? error.message : 'Unable to update the waiter profile.',
      });
      window.setTimeout(() => setToast(null), 3000);
    }
  }

  async function handleDeleteStaff(id: string) {
    const confirmed = window.confirm('Are you sure you want to remove this staff member?');
    if (!confirmed) return;

    try {
      const { error } = await supabase.from(RESTAURANT_TABLES.staffProfiles).delete().eq('id', id);

      if (error) {
        throw error;
      }

      setStaffProfiles((prev) => prev.filter((staff) => staff.id !== id));
    } catch (error) {
      console.log('Save Error: ', error);
      setToast({
        type: 'error',
        title: 'Delete failed',
        message: error instanceof Error ? error.message : 'Unable to delete the waiter profile.',
      });
      window.setTimeout(() => setToast(null), 3000);
    }
  }

  async function hireRider() {
    const name = riderForm.name.trim();
    const phone = riderForm.phone.trim();
    const vehicleDetails = riderForm.vehicleDetails.trim();
    const isActive = riderForm.isActive;

    if (!name || !phone || !vehicleDetails) {
      alert('Please enter Rider Name, Phone, and Vehicle Details.');
      return;
    }

    setRiderHiring(true);
    try {
      const code = `R-${Math.floor(1000 + Math.random() * 9000)}`;
      const pin = String(Math.floor(1000 + Math.random() * 9000));

      const { data, error } = await supabase
        .from(RESTAURANT_TABLES.staffProfiles)
        .insert({
          name,
          role: 'rider',
          phone,
          salary: 0,
          employee_code: code,
          passcode: pin,
        })
        .select('*')
        .single();

      if (error) throw error;

      if (data) {
        const fleetMeta = JSON.parse(localStorage.getItem('rider_fleet_metadata') || '{}');
        fleetMeta[code] = { vehicleDetails, isActive };
        localStorage.setItem('rider_fleet_metadata', JSON.stringify(fleetMeta));
        setStaffProfiles((prev) => [data, ...prev]);
      }

      setRiderForm({ name: '', phone: '', vehicleDetails: '', isActive: true });
      alert(`Rider ${name} added successfully! Code: ${code}, PIN: ${pin}`);
      await loadData();
    } catch (e) {
      console.error('Failed to add rider:', e);
      alert('Failed to add rider to database.');
    } finally {
      setRiderHiring(false);
    }
  }

  async function saveRiderEdits() {
    if (!editingRider) return;
    const code = editingRider.employee_code;
    if (!code) return;

    try {
      const { error } = await supabase
        .from(RESTAURANT_TABLES.staffProfiles)
        .update({
          name: editRiderForm.name.trim(),
          phone: editRiderForm.phone.trim(),
        })
        .eq('id', editingRider.id);

      if (error) throw error;

      const fleetMeta = JSON.parse(localStorage.getItem('rider_fleet_metadata') || '{}');
      fleetMeta[code] = {
        vehicleDetails: editRiderForm.vehicleDetails.trim(),
        isActive: editRiderForm.isActive,
      };
      localStorage.setItem('rider_fleet_metadata', JSON.stringify(fleetMeta));

      setEditingRider(null);
      alert('Rider details saved.');
      await loadData();
    } catch (e) {
      console.error(e);
      alert('Failed to update rider.');
    }
  }

  async function deleteRider(rider: StaffProfile) {
    const confirmed = window.confirm(`Are you sure you want to delete rider ${rider.name}?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase.from(RESTAURANT_TABLES.staffProfiles).delete().eq('id', rider.id);
      if (error) throw error;

      if (rider.employee_code) {
        const fleetMeta = JSON.parse(localStorage.getItem('rider_fleet_metadata') || '{}');
        delete fleetMeta[rider.employee_code];
        localStorage.setItem('rider_fleet_metadata', JSON.stringify(fleetMeta));
      }

      setStaffProfiles((prev) => prev.filter((s) => s.id !== rider.id));
      alert('Rider deleted.');
    } catch (e) {
      console.error(e);
      alert('Failed to delete rider.');
    }
  }

  async function approveLeaveRequests(staffId: string) {
    try {
      const { error } = await supabase
        .from(RESTAURANT_TABLES.leaveRequests)
        .update({ status: 'approved' })
        .eq('staff_id', staffId)
        .eq('status', 'pending');

      if (error) {
        throw error;
      }

      setToast({
        type: 'success',
        title: 'Leave approved',
        message: 'Pending leave requests were approved for that waiter.',
      });
      window.setTimeout(() => setToast(null), 2500);
      await loadData();
    } catch (error) {
      setToast({
        type: 'error',
        title: 'Approval failed',
        message: error instanceof Error ? error.message : 'Unable to approve leave requests.',
      });
      window.setTimeout(() => setToast(null), 3000);
    }
  }

  const tabButtons: Array<{ key: Tab; label: string; icon: typeof BarChart2 }> = [
    { key: 'analytics', label: 'AI Analytics', icon: BarChart2 },
    { key: 'inventory', label: 'Inventory', icon: Database },
    { key: 'financials', label: 'Financials', icon: BadgeDollarSign },
    { key: 'staff-management', label: 'Staff Management', icon: Settings2 },
  ];

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
        {/* Background neon orbs for styling */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-[#C5A880]/5 blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[#C5A880]/3 blur-[95px]" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-8 w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#C5A880]/10 border border-[#C5A880]/25 flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(197,168,128,0.15)]">
              <Shield className="w-8 h-8 text-[#C5A880]" />
            </div>
            <h1 className="font-display text-2xl font-bold text-slate-100" style={{ fontFamily: 'Cinzel, serif' }}>
              Admin Access
            </h1>
            <p className="text-xs text-stone-400 mt-1">Prathomix Restaurant Control Panel</p>
          </div>

          <div className="relative mb-4">
            <input
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                setPwErr('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              type={show ? 'text' : 'password'}
              placeholder="Enter admin password"
              suppressHydrationWarning
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-[#C5A880]/50 rounded-xl px-4 py-3 pr-11 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:shadow-[0_0_15px_rgba(197,168,128,0.15)]"
            />
            <button
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 transition-colors">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {pwErr && (
            <p className="mb-3 rounded-lg border border-red-500/15 bg-red-500/5 px-3 py-2 text-center text-xs text-red-400 font-medium">
              {pwErr}
            </p>
          )}

          <button
            onClick={handleLogin}
            disabled={authLoading}
            className="w-full py-3.5 rounded-xl bg-[#C5A880] hover:bg-[#D5C3AE] disabled:bg-slate-800 text-[#0A0A0A] font-bold text-sm transition-all duration-300 shadow-[0_0_15px_rgba(197,168,128,0.2)] disabled:shadow-none flex items-center justify-center gap-2">
            {authLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Authenticating…
              </>
            ) : (
              'Authenticate'
            )}
          </button>

          <p className="text-[10px] text-stone-500 text-center mt-5">
            This page is not linked from anywhere. Direct URL access only.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="glass border-b border-[#C5A880]/15 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C5A880]" />
            <span className="font-display text-sm font-bold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
              Prathomix Admin
            </span>
            <span className="text-[10px] text-stone-400 border border-[#C5A880]/15 rounded px-1.5 py-0.5 ml-1">
              v1.0
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadData} className="text-stone-400 hover:text-[#C5A880] transition-colors" title="Refresh data">
              <RefreshCw className={`w-4 h-4 ${aLoading ? 'animate-spin text-[#C5A880]' : ''}`} />
            </button>
            <button
              onClick={() => {
                document.cookie = 'prathomix_staff_role=; path=/; max-age=0; samesite=lax';
                setAuthenticated(false);
              }}
              className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-red-400 transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Exit
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 mb-8">
          {tabButtons.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  tab === item.key
                    ? 'bg-[#C5A880]/20 border border-[#C5A880]/40 text-[#C5A880] shadow-[0_0_10px_rgba(197,168,128,0.15)]'
                    : 'glass border border-slate-800 text-stone-450 hover:border-[#C5A880]/30 hover:text-[#C5A880]'
                }`}>
                <Icon className="w-4 h-4" /> {item.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { icon: ShoppingBag, label: 'Menu Items', value: dishes.length, sub: 'total dishes' },
                  { icon: Users, label: 'Bookings', value: analytics?.stats?.bookings ?? 0, sub: 'total reservations' },
                  { icon: TrendingUp, label: 'Orders', value: analytics?.stats?.orders ?? 0, sub: 'orders placed' },
                  {
                    icon: Zap,
                    label: 'Avg Protein',
                    value: analytics?.stats?.avgProtein ? `${Number(analytics.stats.avgProtein).toFixed(1)}g` : '—',
                    sub: 'per dish',
                  },
                ].map((s) => (
                  <div key={s.label} className="glass rounded-2xl p-5 transition-all duration-200 hover:border-[#C5A880]/30 shadow-card">
                    <s.icon className="w-5 h-5 text-[#C5A880] mb-3 opacity-70" />
                    <p className="text-2xl font-bold text-slate-100">{aLoading ? <Loader2 className="w-5 h-5 animate-spin text-stone-400" /> : s.value}</p>
                    <p className="text-xs text-stone-300 mt-0.5">{s.label}</p>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#C5A880]/70 mt-1">{s.sub}</p>
                  </div>
                ))}
              </div>
                          {/* Business Analyzer Section */}
              <div className="grid lg:grid-cols-3 gap-6 mb-8">
                {/* Revenue by Category Bar Chart */}
                <div className="glass rounded-2xl p-6 shadow-md">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart2 className="w-5 h-5 text-[#C5A880]" />
                    <h3 className="font-display text-base font-semibold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
                      Revenue by Category
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {categoryRevenue.map((item) => {
                      const maxVal = Math.max(...categoryRevenue.map((c) => c.revenue), 1);
                      const pct = Math.round((item.revenue / maxVal) * 100);
                      return (
                        <div key={item.category} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold text-slate-200">
                            <span>{item.category}</span>
                            <span>₹{item.revenue}</span>
                          </div>
                          <div className="w-full h-3 bg-slate-950/40 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className="h-full bg-gradient-to-r from-[#8C7355] to-[#C5A880] rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(197,168,128,0.3)]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Delivery vs Dine-in columns */}
                <div className="glass rounded-2xl p-6 shadow-md flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-[#C5A880]" />
                    <h3 className="font-display text-base font-semibold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
                      Delivery vs Dine-in Volume
                    </h3>
                  </div>
                  <div className="flex justify-around items-end h-40 pt-4 border-b border-slate-800 pb-2 flex-1">
                    {/* Dine-in column */}
                    <div className="flex flex-col items-center gap-1.5 w-20">
                      <span className="text-[10px] font-bold text-[#C5A880]">₹{deliveryVsDineIn.dineInRev}</span>
                      <div
                        className="w-10 bg-gradient-to-t from-[#8C7355] to-[#C5A880] rounded-t-lg transition-all duration-1000 shadow-[0_0_12px_rgba(197,168,128,0.25)]"
                        style={{ height: `${(deliveryVsDineIn.dineInRev / (deliveryVsDineIn.dineInRev + deliveryVsDineIn.deliveryRev || 1)) * 90 + 10}px` }}
                      />
                      <span className="text-[10px] font-bold text-stone-300 uppercase tracking-wider text-center">Dine-in ({deliveryVsDineIn.dineInCount})</span>
                    </div>
                    {/* Delivery column */}
                    <div className="flex flex-col items-center gap-1.5 w-20">
                      <span className="text-[10px] font-bold text-[#C5A880]">₹{deliveryVsDineIn.deliveryRev}</span>
                      <div
                        className="w-10 bg-gradient-to-t from-[#C5A880] to-[#EAE6DF] rounded-t-lg transition-all duration-1000 shadow-[0_0_12px_rgba(197,168,128,0.25)]"
                        style={{ height: `${(deliveryVsDineIn.deliveryRev / (deliveryVsDineIn.dineInRev + deliveryVsDineIn.deliveryRev || 1)) * 90 + 10}px` }}
                      />
                      <span className="text-[10px] font-bold text-stone-300 uppercase tracking-wider text-center">Delivery ({deliveryVsDineIn.deliveryCount})</span>
                    </div>
                  </div>
                </div>

                {/* Peak Order Hours Line Graph */}
                <div className="glass rounded-2xl p-6 shadow-md flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock3 className="w-5 h-5 text-[#C5A880]" />
                    <h3 className="font-display text-base font-semibold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
                      Peak Order Hours
                    </h3>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <svg viewBox="0 0 100 40" className="w-full h-32 bg-slate-950/30 border border-slate-800 rounded-2xl p-2 shadow-inner">
                      <defs>
                        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#C5A880" stopOpacity="0.25"/>
                          <stop offset="100%" stopColor="#C5A880" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      <line x1="10" y1="10" x2="90" y2="10" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                      <line x1="10" y1="20" x2="90" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                      <line x1="10" y1="30" x2="90" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                      
                      <path
                        d={`M 10,${35 - (peakHours.morning / 50) * 25} 
                            L 36,${35 - (peakHours.lunch / 50) * 25} 
                            L 63,${35 - (peakHours.evening / 50) * 25} 
                            L 90,${35 - (peakHours.dinner / 50) * 25} 
                            L 90,35 L 10,35 Z`}
                        fill="url(#area-grad)"
                      />
                      
                      <path
                        d={`M 10,${35 - (peakHours.morning / 50) * 25} 
                            C 23,${35 - (peakHours.lunch / 50) * 25} 23,${35 - (peakHours.lunch / 50) * 25} 36,${35 - (peakHours.lunch / 50) * 25}
                            C 49,${35 - (peakHours.evening / 50) * 25} 49,${35 - (peakHours.evening / 50) * 25} 63,${35 - (peakHours.evening / 50) * 25}
                            C 76,${35 - (peakHours.dinner / 50) * 25} 76,${35 - (peakHours.dinner / 50) * 25} 90,${35 - (peakHours.dinner / 50) * 25}`}
                        fill="none"
                        stroke="#C5A880"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      
                      <circle cx="10" cy={35 - (peakHours.morning / 50) * 25} r="1.8" fill="#0A0A0A" stroke="#C5A880" strokeWidth="1" />
                      <circle cx="36" cy={35 - (peakHours.lunch / 50) * 25} r="1.8" fill="#0A0A0A" stroke="#C5A880" strokeWidth="1" />
                      <circle cx="63" cy={35 - (peakHours.evening / 50) * 25} r="1.8" fill="#0A0A0A" stroke="#C5A880" strokeWidth="1" />
                      <circle cx="90" cy={35 - (peakHours.dinner / 50) * 25} r="1.8" fill="#0A0A0A" stroke="#C5A880" strokeWidth="1" />
                      
                      <text x="10" y="39" fill="rgba(255,255,255,0.4)" fontSize="3.5" textAnchor="middle" fontWeight="bold">Breakfast</text>
                      <text x="36" y="39" fill="rgba(255,255,255,0.4)" fontSize="3.5" textAnchor="middle" fontWeight="bold">Lunch</text>
                      <text x="63" y="39" fill="rgba(255,255,255,0.4)" fontSize="3.5" textAnchor="middle" fontWeight="bold">Snacks</text>
                      <text x="90" y="39" fill="rgba(255,255,255,0.4)" fontSize="3.5" textAnchor="middle" fontWeight="bold">Dinner</text>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="glass rounded-2xl p-6 shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#C5A880]" />
                    <h2 className="font-display text-lg font-semibold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
                      AI Business Insights
                    </h2>
                  </div>
                  <span className="text-[10px] text-stone-400 border border-[#C5A880]/15 rounded px-2 py-0.5">Gemini → Groq</span>
                </div>

                {aLoading ? (
                  <div className="flex items-center gap-2 text-stone-300 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-[#C5A880]" /> Generating AI insights from your data…
                  </div>
                ) : analytics?.insights ? (
                  <div className="text-stone-200 text-sm leading-relaxed whitespace-pre-wrap">{analytics.insights}</div>
                ) : (
                  <p className="text-stone-450 text-sm">
                    No AI insights yet. Make sure your Gemini or Groq API key is set in <code className="text-[#C5A880]">.env.local</code>, then add some bookings and orders.
                  </p>
                )}
              </div>

              <div className="grid lg:grid-cols-2 gap-6 mt-6">
                <div className="glass rounded-2xl p-6 shadow-md">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-[#C5A880]" />
                    <h3 className="font-display text-lg font-semibold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
                      Customer Sentiment Summary
                    </h3>
                  </div>
                  {aLoading ? (
                    <div className="flex items-center gap-2 text-stone-300 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-[#C5A880]" /> Reading guest feedback…
                    </div>
                  ) : analytics?.sentimentSummary ? (
                    <p className="text-stone-200 text-sm leading-relaxed whitespace-pre-wrap">{analytics.sentimentSummary}</p>
                  ) : (
                    <p className="text-stone-400 text-sm">
                      No sentiment summary yet. Add feedback data and set your AI keys in <span className="text-[#C5A880]">.env.local</span>.
                    </p>
                  )}
                </div>

                <div className="glass rounded-2xl p-6 shadow-md">
                  <div className="flex items-center gap-2 mb-4">
                    <ShoppingBag className="w-5 h-5 text-[#C5A880]" />
                    <h3 className="font-display text-lg font-semibold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
                      Inventory Overview
                    </h3>
                  </div>
                  <p className="text-stone-300 text-sm leading-relaxed">Use the Inventory tab for live ingredient risk detection and dish planning.</p>
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'inventory' && (
            <motion.div key="inventory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="glass border border-fuchsia-500/30 rounded-3xl p-6 shadow-lg shadow-fuchsia-950/5 relative overflow-hidden bg-gradient-to-br from-fuchsia-950/10 via-slate-900/5 to-slate-950/20 mb-8">
                <div className="absolute top-0 right-0 w-32 h-1 bg-gradient-to-l from-fuchsia-500 to-transparent" />
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/25 flex items-center justify-center shadow-[0_0_15px_rgba(217,70,239,0.15)] animate-pulse">
                    <Sparkles className="w-5 h-5 text-fuchsia-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-fuchsia-400 font-bold uppercase tracking-widest block">AI Restock Foresight v2.4</span>
                    <h3 className="font-display text-lg font-bold text-slate-100" style={{ fontFamily: 'Cinzel, serif' }}>AI Predictive Restock & Demand Forecasting</h3>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 mt-4">
                  {/* High Demand Items Prediction */}
                  <div className="bg-slate-950/45 p-4 rounded-2xl border border-slate-800/80">
                    <h4 className="text-xs font-bold text-fuchsia-400 uppercase tracking-widest mb-3">Next Week&apos;s High-Demand Items</h4>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center bg-slate-900/30 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-slate-300 font-medium">Avocado Tuna Bowl</span>
                        <span className="text-emerald-400 font-bold font-mono">+38% demand spike</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-900/30 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-slate-300 font-medium">Grilled Chicken Powerhouse</span>
                        <span className="text-emerald-400 font-bold font-mono">+25% increase</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-900/30 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-slate-300 font-medium">Chicken Biryani</span>
                        <span className="text-emerald-400 font-bold font-mono">+18% increase</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Restock Alerts */}
                  <div className="bg-slate-950/45 p-4 rounded-2xl border border-slate-800/80">
                    <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-3">Inventory Restock Alerts</h4>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/15">
                        <div>
                          <span className="text-slate-300 font-bold block">Organic Quinoa</span>
                          <span className="text-[10px] text-slate-500 block">Current stock: 4.2 kg (Low)</span>
                        </div>
                        <span className="text-amber-500 font-bold font-mono text-[10px] uppercase">Exhausts in 2 days</span>
                      </div>
                      <div className="flex justify-between items-center bg-red-500/5 p-2.5 rounded-xl border border-red-500/15">
                        <div>
                          <span className="text-slate-300 font-bold block">Wild-caught Tuna</span>
                          <span className="text-[10px] text-slate-500 block">Current stock: 2.8 kg (Critical)</span>
                        </div>
                        <span className="text-red-400 font-bold font-mono text-[10px] uppercase">Order immediately</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="glass border border-warm-200 rounded-2xl p-6 shadow-warm-md">
                  <h2 className="font-display text-lg font-semibold gradient-text mb-5 flex items-center gap-2" style={{ fontFamily: 'Cinzel, serif' }}>
                    <PlusCircle className="w-5 h-5 text-primary-600" /> Add New Dish
                  </h2>

                  <div className="flex flex-col gap-3.5">
                    {[
                      { k: 'name', label: 'Dish Name *', placeholder: 'e.g. Grilled Salmon', type: 'text' },
                      { k: 'description', label: 'Description', placeholder: 'Brief description…', type: 'text' },
                      { k: 'price', label: 'Price (₹) *', placeholder: '349', type: 'number' },
                      { k: 'calories', label: 'Calories', placeholder: '420', type: 'number' },
                      { k: 'protein', label: 'Protein (g)', placeholder: '38.5', type: 'number' },
                      { k: 'image_url', label: 'Image URL', placeholder: 'https://…', type: 'url' },
                    ].map((field) => (
                      <div key={field.k}>
                        <label className="text-xs text-gray-600 mb-1 block">{field.label}</label>
                        <input
                          value={(form as any)[field.k]}
                          type={field.type}
                          placeholder={field.placeholder}
                          onChange={(e) => setForm((prev) => ({ ...prev, [field.k]: e.target.value }))}
                          suppressHydrationWarning
                          className="w-full bg-transparent border border-warm-200 focus:border-primary-600/50 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:shadow-warm"
                        />
                      </div>
                    ))}

                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Category</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                        suppressHydrationWarning
                        className="w-full bg-warm-50 border border-warm-200 focus:border-primary-600/50 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all">
                        {['Main', 'High Protein', 'Low Cal', 'Vegetarian', 'Dessert', 'Drinks'].map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={addDish}
                      disabled={saving || !form.name.trim() || !form.price}
                      className="py-3 rounded-xl bg-primary-600/15 hover:bg-primary-600/25 border border-primary-600/30 text-primary-600 font-semibold text-sm transition-all duration-200 hover:shadow-warm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                        </>
                      ) : saved ? (
                        '✅ Dish Added!'
                      ) : (
                        <>
                          <PlusCircle className="w-4 h-4" /> Add to Menu
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <h2 className="font-display text-lg font-semibold gradient-text mb-5 flex items-center gap-2" style={{ fontFamily: 'Cinzel, serif' }}>
                    <ShoppingBag className="w-5 h-5 text-primary-600" /> Current Menu ({dishes.length})
                  </h2>

                  <div className="flex flex-col gap-3 max-h-[620px] overflow-y-auto pr-1">
                    {aLoading ? (
                      Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-16 glass rounded-xl animate-pulse border border-warm-200" />)
                    ) : dishes.length === 0 ? (
                      <p className="text-gray-600 text-sm text-center py-8">No dishes yet. Add your first one!</p>
                    ) : (
                      dishes.map((dish: any) => (
                        <div key={dish.id} className="glass border border-warm-200 rounded-xl p-3 flex gap-3 items-center hover:border-primary-600/30 transition-all duration-200 shadow-card">
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={dish.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}
                              alt={dish.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-900 truncate">{dish.name}</p>
                            <p className="text-xs text-slate-500">₹{dish.price} · {dish.calories} cal · {dish.protein}g protein</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-[10px] bg-primary-600/10 border border-primary-600/15 text-primary-700 px-2 py-0.5 rounded-full">
                              {dish.category}
                            </span>
                            {lowPerformingDishIds.has(dish.id) && (
                              <button
                                onClick={() => handleGeneratePromo(dish)}
                                disabled={promoLoadingId === dish.id}
                                className="inline-flex items-center gap-1.5 rounded-full border border-primary-600/20 bg-primary-600/10 px-2.5 py-1 text-[10px] font-semibold text-primary-700 transition-all hover:bg-primary-600/15 disabled:opacity-60 disabled:cursor-not-allowed">
                                {promoLoadingId === dish.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                                AI Promo Generator
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'financials' && (
            <motion.div key="financials" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="glass border border-warm-200 rounded-2xl p-6 shadow-warm-md mb-6 bg-primary-600/5">
                <div className="flex items-center gap-2 mb-2">
                  <BadgeDollarSign className="w-5 h-5 text-primary-600" />
                  <h2 className="font-display text-lg font-semibold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
                    Financials Overview
                  </h2>
                </div>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Revenue is calculated from completed orders in Supabase. The table below shows the latest completed transactions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                {[
                  { icon: BadgeDollarSign, label: 'Daily Revenue', value: formatCurrency(financialSummary.dailyRevenue), sub: 'Completed orders today' },
                  { icon: TrendingUp, label: 'Weekly Revenue', value: formatCurrency(financialSummary.weeklyRevenue), sub: 'Current week to date' },
                  { icon: ReceiptText, label: 'Monthly Revenue', value: formatCurrency(financialSummary.monthlyRevenue), sub: 'Current month to date' },
                  { icon: CheckCircle2, label: 'Completed Transactions', value: financialSummary.completedTransactions, sub: 'Orders + bookings' },
                ].map((stat) => (
                  <div key={stat.label} className="glass border border-warm-200 hover:border-primary-600/30 rounded-2xl p-5 transition-all duration-200 shadow-card hover:shadow-warm">
                    <stat.icon className="w-5 h-5 text-primary-600 mb-3 opacity-70" />
                    <p className="text-2xl font-bold text-gray-900">{aLoading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : stat.value}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{stat.label}</p>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400 mt-1">{stat.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6 items-start">
                <div className="glass border border-warm-200 rounded-2xl p-6 shadow-warm-md">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Clock3 className="w-5 h-5 text-primary-600" />
                      <h3 className="font-display text-lg font-semibold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
                        Recent Completed Transactions
                      </h3>
                    </div>
                    <span className="text-[10px] text-gray-600 border border-warm-200 rounded px-2 py-0.5">
                      Latest completed orders
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-warm-200 bg-white/35">
                    <table className="w-full text-left">
                      <thead className="bg-white/50">
                        <tr className="text-[10px] uppercase tracking-[0.25em] text-gray-500">
                          <th className="px-4 py-3 font-semibold">Table</th>
                          <th className="px-4 py-3 font-semibold">Amount</th>
                          <th className="px-4 py-3 font-semibold">Date</th>
                          <th className="px-4 py-3 font-semibold">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aLoading ? (
                          <tr>
                            <td className="px-4 py-5 text-sm text-gray-500" colSpan={4}>
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary-600" /> Loading transactions…
                              </div>
                            </td>
                          </tr>
                        ) : financialSummary.recentTransactions.length === 0 ? (
                          <tr>
                            <td className="px-4 py-5 text-sm text-gray-500" colSpan={4}>
                              No completed transactions yet.
                            </td>
                          </tr>
                        ) : (
                          financialSummary.recentTransactions.map((transaction) => (
                            <tr key={transaction.id} className="border-t border-warm-200/70">
                              <td className="px-4 py-4 text-sm font-medium text-stone-800">Table {transaction.table_number ?? '—'}</td>
                              <td className="px-4 py-4 text-sm text-stone-700">{formatCurrency(Number(transaction.total_amount ?? 0))}</td>
                              <td className="px-4 py-4 text-sm text-stone-700">{formatDateTime(transaction.created_at)}</td>
                              <td className="px-4 py-4 text-sm text-stone-700">{formatTime(transaction.created_at)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="glass border border-warm-200 rounded-2xl p-6 shadow-warm-md">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-primary-600" />
                    <h3 className="font-display text-lg font-semibold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
                      Revenue Notes
                    </h3>
                  </div>

                  <div className="space-y-4 text-sm text-stone-700 leading-relaxed">
                    <div className="rounded-2xl bg-white/40 border border-warm-200 p-4">
                      <p className="font-semibold text-stone-900 mb-1">Completed bookings tracked</p>
                      <p>{completedBookings.length} bookings are marked as completed in Supabase.</p>
                    </div>
                    <div className="rounded-2xl bg-white/40 border border-warm-200 p-4">
                      <p className="font-semibold text-stone-900 mb-1">Today’s booked tables</p>
                      <p>{financialSummary.todayBookings} reservations were created or scheduled for today.</p>
                    </div>
                    <div className="rounded-2xl bg-primary-50 border border-primary-600/15 p-4">
                      <p className="font-semibold text-primary-900 mb-1">Revenue source</p>
                      <p className="text-primary-800/90">
                        Revenue is taken from completed orders so the figures stay tied to actual paid transactions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'staff-management' && (
            <motion.div key="staff-management" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="glass border border-warm-200 rounded-2xl p-6 shadow-warm-md mb-6 bg-primary-600/5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <KeyRound className="w-5 h-5 text-primary-600" />
                      <h2 className="font-display text-lg font-semibold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
                        Staff Management
                      </h2>
                    </div>
                    <p className="text-sm text-stone-600 leading-relaxed">
                      Hire staff into Supabase and keep the staff access passwords updated from the same tab.
                    </p>
                  </div>

                  <button
                    onClick={() => setStaffModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 bg-primary-600/15 hover:bg-primary-600/25 border border-primary-600/30 text-primary-600 font-semibold text-sm transition-all duration-200 hover:shadow-warm">
                    <PlusCircle className="w-4 h-4" /> Hire Staff
                  </button>
                </div>
              </div>

              <div className="glass border border-warm-200 rounded-2xl p-6 shadow-warm-md mb-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-display text-lg font-semibold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
                      Hired Staff ({staffProfiles.length})
                    </h3>
                      <p className="text-sm text-stone-600 mt-1">Clean table view of all staff profiles stored in Supabase.</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-warm-200 bg-white/35">
                  <table className="w-full text-left">
                    <thead className="bg-white/50">
                      <tr className="text-[10px] uppercase tracking-[0.25em] text-gray-500">
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">ID</th>
                        <th className="px-4 py-3 font-semibold">Role</th>
                        <th className="px-4 py-3 font-semibold">Passcode</th>
                        <th className="px-4 py-3 font-semibold">Salary</th>
                        <th className="px-4 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {staffProfiles && staffProfiles.filter((s) => s.role !== 'rider').length > 0 ? (
                        staffProfiles.filter((s) => s.role !== 'rider').map((staff, index) => (
                          <tr key={staff.id || index} className="hover:bg-amber-50/50 transition duration-150">
                            <td className="py-4 px-6 text-sm font-medium text-amber-900">{staff.name}</td>
                            <td className="py-4 px-6 text-sm text-amber-700 font-mono">{staff.employee_code || 'N/A'}</td>
                            <td className="py-4 px-6 text-sm text-amber-700 capitalize">{staff.role || 'Staff'}</td>
                            <td className="py-4 px-6 text-sm text-amber-700 font-mono tracking-widest">{staff.passcode || '****'}</td>
                            <td className="py-4 px-6 text-sm text-amber-900 font-semibold">{staff.salary ? `₹${staff.salary}` : '-'}</td>
                            <td className="py-4 px-6 text-sm">
                              <div className="flex gap-3">
                                <button className="text-amber-600 hover:text-amber-800 font-semibold text-xs uppercase tracking-wider transition">Edit</button>
                                <button onClick={() => handleDeleteStaff(staff.id)} className="text-red-500 hover:text-red-700 font-semibold text-xs uppercase tracking-wider transition">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-sm text-amber-600/70 bg-amber-50/20">
                            No staff hired yet. Use the button above to add the first staff profile.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rider Fleet Management & Database Grid */}
              <div className="grid lg:grid-cols-2 gap-8 mb-8">
                {/* Add New Rider Form */}
                <div className="glass border border-warm-200 rounded-2xl p-6 shadow-warm-md">
                  <h3 className="font-display text-lg font-semibold gradient-text mb-5 flex items-center gap-2" style={{ fontFamily: 'Cinzel, serif' }}>
                    <Bike className="w-5 h-5 text-primary-600" /> Add New Rider
                  </h3>
                  
                  <div className="flex flex-col gap-3.5">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Rider Name *</label>
                      <input
                        value={riderForm.name}
                        onChange={(e) => setRiderForm((prev) => ({ ...prev, name: e.target.value }))}
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        className="w-full bg-transparent border border-warm-200 focus:border-primary-600/50 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:shadow-warm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Phone Number *</label>
                      <input
                        value={riderForm.phone}
                        onChange={(e) => setRiderForm((prev) => ({ ...prev, phone: e.target.value }))}
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        className="w-full bg-transparent border border-warm-200 focus:border-primary-600/50 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:shadow-warm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Vehicle Details *</label>
                      <input
                        value={riderForm.vehicleDetails}
                        onChange={(e) => setRiderForm((prev) => ({ ...prev, vehicleDetails: e.target.value }))}
                        type="text"
                        placeholder="e.g. Honda Activa MH-12-XX-1234"
                        className="w-full bg-transparent border border-warm-200 focus:border-primary-600/50 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:shadow-warm"
                      />
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-warm-200/50">
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">Fleet Active Status</span>
                        <span className="text-[10px] text-slate-500 block">Rider is currently working / available</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRiderForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                        className={`w-12 h-6 rounded-full transition p-1 flex items-center ${
                          riderForm.isActive ? 'bg-emerald-500/20 border border-emerald-500/40 justify-end' : 'bg-slate-200 border border-slate-300 justify-start'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full ${riderForm.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      </button>
                    </div>

                    <button
                      onClick={hireRider}
                      disabled={riderHiring || !riderForm.name || !riderForm.phone || !riderForm.vehicleDetails}
                      className="w-full py-3.5 rounded-xl bg-primary-600/15 hover:bg-primary-600/25 border border-primary-600/30 text-primary-600 font-semibold text-xs uppercase tracking-wider transition hover:shadow-warm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {riderHiring ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Adding Rider...
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-4 h-4" /> Add Rider to Fleet
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Rider List Table */}
                <div className="glass border border-warm-200 rounded-2xl p-6 shadow-warm-md flex flex-col">
                  <h3 className="font-display text-lg font-semibold gradient-text mb-5 flex items-center gap-2" style={{ fontFamily: 'Cinzel, serif' }}>
                    <Bike className="w-5 h-5 text-primary-600" /> Rider Fleet Database
                  </h3>
                  
                  <div className="overflow-hidden rounded-2xl border border-warm-200 bg-white/35 flex-1 max-h-[360px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/50 sticky top-0 z-10">
                        <tr className="text-[9px] uppercase tracking-[0.2em] text-gray-500">
                          <th className="px-4 py-3 font-semibold">Name</th>
                          <th className="px-4 py-3 font-semibold">Code / PIN</th>
                          <th className="px-4 py-3 font-semibold">Vehicle</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {staffProfiles.filter((s) => s.role === 'rider').length > 0 ? (
                          staffProfiles.filter((s) => s.role === 'rider').map((rider, index) => {
                            let metadata = { vehicleDetails: 'N/A', isActive: true };
                            if (typeof window !== 'undefined') {
                              const stored = JSON.parse(localStorage.getItem('rider_fleet_metadata') || '{}');
                              if (rider.employee_code && stored[rider.employee_code]) {
                                metadata = stored[rider.employee_code];
                              }
                            }
                            return (
                              <tr key={rider.id || index} className="hover:bg-amber-50/50 transition">
                                <td className="py-3.5 px-4 font-semibold text-slate-800">
                                  {rider.name}
                                  <span className="block text-[10px] font-normal text-slate-500">{rider.phone}</span>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-slate-700">
                                  {rider.employee_code}
                                  <span className="block text-[10px] text-slate-500 tracking-wider">PIN: {rider.passcode}</span>
                                </td>
                                <td className="py-3.5 px-4 text-slate-700">{metadata.vehicleDetails}</td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    metadata.isActive
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}>
                                    {metadata.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingRider(rider);
                                        setEditRiderForm({
                                          name: rider.name || '',
                                          phone: rider.phone || '',
                                          vehicleDetails: metadata.vehicleDetails,
                                          isActive: metadata.isActive,
                                        });
                                      }}
                                      className="text-amber-700 hover:text-amber-900 font-bold uppercase text-[9px]"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => deleteRider(rider)}
                                      className="text-red-500 hover:text-red-700 font-bold uppercase text-[9px]"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-500">
                              No riders in the fleet. Add one above.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                {STAFF_CARDS.map((staff) => (
                  <div key={staff.role} className="glass border border-warm-200 rounded-2xl p-6 shadow-warm-md">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-primary-600 mb-1">{staff.label} Access</p>
                        <h3 className="font-display text-xl font-semibold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
                          Update Password
                        </h3>
                        <p className="text-sm text-stone-600 mt-2 leading-relaxed">{staff.description}</p>
                      </div>
                      <div className="w-11 h-11 rounded-2xl bg-primary-600/10 border border-primary-600/20 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-primary-600" />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                      <input
                        value={staffDrafts[staff.role]}
                        onChange={(e) => setStaffDrafts((prev) => ({ ...prev, [staff.role]: e.target.value }))}
                        type="password"
                        placeholder={`New ${staff.label.toLowerCase()} password`}
                        suppressHydrationWarning
                        className="flex-1 bg-transparent border border-warm-200 focus:border-primary-600/50 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:shadow-warm"
                      />
                      <button
                        onClick={() => updatePassword(staff.role, staffDrafts[staff.role])}
                        disabled={staffSavingRole === staff.role}
                        className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 bg-primary-600/15 hover:bg-primary-600/25 border border-primary-600/30 text-primary-600 font-semibold text-sm transition-all duration-200 hover:shadow-warm disabled:opacity-60 disabled:cursor-not-allowed">
                        {staffSavingRole === staff.role ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Updating…
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" /> Update
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {staffModalOpen && (
          <motion.div
            className="fixed inset-0 z-[65] flex items-center justify-center bg-stone-950/30 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}>
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              className="glass border border-warm-200 rounded-2xl w-full max-w-lg p-6 shadow-warm-xl">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-primary-600 mb-1">Staff Profile</p>
                  <h3 className="font-display text-xl font-semibold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
                    Hire New Staff
                  </h3>
                </div>
                <button onClick={() => setStaffModalOpen(false)} className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
                  Close
                </button>
              </div>

              <form
                className="grid gap-4"
                onSubmit={(e: FormEvent<HTMLFormElement>) => {
                  e.preventDefault();
                  void hireWaiter();
                }}>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Name</label>
                  <input
                    value={waiterForm.name}
                    onChange={(e) => setWaiterForm((prev) => ({ ...prev, name: e.target.value }))}
                    type="text"
                    placeholder="e.g. Aakash Verma"
                    suppressHydrationWarning
                    className="w-full bg-transparent border border-warm-200 focus:border-primary-600/50 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:shadow-warm"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Employee Code</label>
                    <input
                      value={waiterForm.employeeCode}
                      readOnly
                      suppressHydrationWarning
                      className="w-full bg-warm-50 border border-warm-200 rounded-xl px-4 py-3 text-sm font-mono text-gray-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">4-Digit PIN</label>
                    <input
                      value={waiterForm.passcode}
                      readOnly
                      suppressHydrationWarning
                      className="w-full bg-warm-50 border border-warm-200 rounded-xl px-4 py-3 text-sm font-mono text-gray-900 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setWaiterForm({ name: waiterForm.name, role: waiterForm.role, ...createWaiterCredentials() })}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary-600/20 bg-primary-600/10 px-4 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-600/15">
                  Regenerate Credentials
                </button>

                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Role</label>
                  <select
                    value={waiterForm.role}
                    onChange={(e) => setWaiterForm((prev) => ({ ...prev, role: e.target.value }))}
                    suppressHydrationWarning
                    className="w-full bg-warm-50 border border-warm-200 focus:border-primary-600/50 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition-all">
                    {['Server', 'Chef', 'Manager', 'Receptionist', 'Waiter'].map((roleOption) => (
                      <option key={roleOption} value={roleOption}>
                        {roleOption}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={staffHiring}
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 bg-primary-600/15 hover:bg-primary-600/25 border border-primary-600/30 text-primary-600 font-semibold text-sm transition-all duration-200 hover:shadow-warm disabled:opacity-60 disabled:cursor-not-allowed">
                  {staffHiring ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Hiring…
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" /> Save Staff
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingWaiter && (
          <motion.div
            className="fixed inset-0 z-[66] flex items-center justify-center bg-stone-950/30 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}>
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              className="glass border border-warm-200 rounded-2xl w-full max-w-lg p-6 shadow-warm-xl">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-primary-600 mb-1">Edit Waiter</p>
                  <h3 className="font-display text-xl font-semibold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
                    {editingWaiter.name}
                  </h3>
                </div>
                <button onClick={() => setEditingWaiter(null)} className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
                  Close
                </button>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Name</label>
                  <input
                    value={editWaiterForm.name}
                    onChange={(e) => setEditWaiterForm((prev) => ({ ...prev, name: e.target.value }))}
                    type="text"
                    suppressHydrationWarning
                    className="w-full bg-transparent border border-warm-200 focus:border-primary-600/50 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:shadow-warm"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 mb-1 block">4-Digit PIN</label>
                  <input
                    value={editWaiterForm.passcode}
                    onChange={(e) => setEditWaiterForm((prev) => ({ ...prev, passcode: e.target.value }))}
                    type="text"
                    inputMode="numeric"
                    suppressHydrationWarning
                    className="w-full bg-transparent border border-warm-200 focus:border-primary-600/50 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:shadow-warm"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditWaiterForm((prev) => ({ ...prev, passcode: createWaiterCredentials().passcode }))}
                    className="rounded-xl border border-primary-600/20 bg-primary-600/10 px-4 py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-600/15">
                    Regenerate PIN
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveWaiterEdits()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 bg-primary-600/15 hover:bg-primary-600/25 border border-primary-600/30 text-primary-600 font-semibold text-sm transition-all duration-200 hover:shadow-warm">
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rider Edit Modal */}
      <AnimatePresence>
        {editingRider && (
          <motion.div
            className="fixed inset-0 z-[67] flex items-center justify-center bg-stone-950/30 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}>
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              className="glass border border-warm-200 rounded-2xl w-full max-w-lg p-6 shadow-warm-xl">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-primary-600 mb-1">Edit Rider Fleet Profile</p>
                  <h3 className="font-display text-xl font-semibold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
                    {editingRider.name}
                  </h3>
                </div>
                <button onClick={() => setEditingRider(null)} className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
                  Close
                </button>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Rider Name</label>
                  <input
                    value={editRiderForm.name}
                    onChange={(e) => setEditRiderForm((prev) => ({ ...prev, name: e.target.value }))}
                    type="text"
                    className="w-full bg-transparent border border-warm-200 focus:border-primary-600/50 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:shadow-warm"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Phone Number</label>
                  <input
                    value={editRiderForm.phone}
                    onChange={(e) => setEditRiderForm((prev) => ({ ...prev, phone: e.target.value }))}
                    type="tel"
                    className="w-full bg-transparent border border-warm-200 focus:border-primary-600/50 rounded-xl px-4 py-3 text-sm text-gray-950 outline-none transition-all focus:shadow-warm"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Vehicle Details</label>
                  <input
                    value={editRiderForm.vehicleDetails}
                    onChange={(e) => setEditRiderForm((prev) => ({ ...prev, vehicleDetails: e.target.value }))}
                    type="text"
                    className="w-full bg-transparent border border-warm-200 focus:border-primary-600/50 rounded-xl px-4 py-3 text-sm text-gray-950 outline-none transition-all focus:shadow-warm"
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-b border-warm-200/50">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Fleet Active Status</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditRiderForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                    className={`w-12 h-6 rounded-full transition p-1 flex items-center ${
                      editRiderForm.isActive ? 'bg-emerald-500/20 border border-emerald-500/40 justify-end' : 'bg-slate-200 border border-slate-300 justify-start'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${editRiderForm.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingRider(null)}
                    className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveRiderEdits()}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 bg-primary-600/15 hover:bg-primary-600/25 border border-primary-600/30 text-primary-600 font-semibold text-sm transition-all duration-200 hover:shadow-warm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {promoModal && (
          <motion.div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/25 px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              className="glass border border-warm-200 rounded-2xl w-full max-w-xl p-6 shadow-warm-xl">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-primary-600 mb-1">AI Promo Copy</p>
                  <h3 className="font-display text-xl font-semibold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
                    {promoModal.name}
                  </h3>
                </div>
                <button onClick={() => setPromoModal(null)} className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
                  Close
                </button>
              </div>

              <div className="rounded-2xl border border-warm-200 bg-warm-50 p-4 text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
                {promoModal.text}
              </div>

              <div className="flex items-center justify-between gap-3 mt-4">
                <p className="text-xs text-stone-500">Ready to paste into Instagram or SMS.</p>
                <button
                  onClick={copyPromoText}
                  className="inline-flex items-center gap-2 rounded-xl border border-primary-600/20 bg-primary-600/10 px-4 py-2 text-sm font-semibold text-primary-700 transition-all hover:bg-primary-600/15">
                  <Copy className="w-4 h-4" />
                  {copiedPromo ? 'Copied' : 'Copy text'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="fixed bottom-5 right-5 z-[70] w-[min(92vw,360px)] glass border border-warm-200 rounded-2xl p-4 shadow-warm-lg">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${toast.type === 'success' ? 'bg-emerald-100 border border-emerald-200' : 'bg-rose-100 border border-rose-200'}`}>
                {toast.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-stone-900">{toast.title}</p>
                <p className="text-sm text-stone-600 mt-0.5 leading-relaxed">{toast.message}</p>
              </div>
              <button onClick={() => setToast(null)} className="text-stone-500 hover:text-stone-800 text-sm">
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}