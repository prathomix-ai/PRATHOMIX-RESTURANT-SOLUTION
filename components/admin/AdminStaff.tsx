'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Shield,
  Search,
  KeyRound,
  Phone,
  Mail,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  Edit2,
  Trash2,
  X,
  BadgeAlert,
  CalendarCheck,
} from 'lucide-react';
import { supabase, RESTAURANT_TABLES, DEFAULT_RESTAURANT_ID, type UserRole, type StaffProfile } from '@/lib/supabase';

interface StaffMember {
  id: string;
  name: string;
  role: UserRole;
  employee_code: string;
  passcode: string;
  phone: string;
  email: string;
  salary: number;
  status: 'active' | 'suspended' | 'on_leave';
  shift: 'Morning' | 'Evening' | 'Double' | 'Off';
  joined_date: string;
}

const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'Alexander Wright',
    role: 'owner',
    employee_code: 'ADM-01',
    passcode: 'prathomix2024',
    phone: '+91 98200 11001',
    email: 'owner@prathomix.com',
    salary: 250000,
    status: 'active',
    shift: 'Morning',
    joined_date: '2023-01-15',
  },
  {
    id: 'staff-2',
    name: 'Sarah Jenkins',
    role: 'admin',
    employee_code: 'ADM-02',
    passcode: 'prathomix2024',
    phone: '+91 98200 22002',
    email: 'admin@prathomix.tech',
    salary: 110000,
    status: 'active',
    shift: 'Morning',
    joined_date: '2023-06-10',
  },
  {
    id: 'staff-3',
    name: 'Chef Jean-Luc',
    role: 'chef',
    employee_code: 'CHF-01',
    passcode: 'kitchen2026',
    phone: '+91 98300 33003',
    email: 'chef@prathomix.com',
    salary: 95000,
    status: 'active',
    shift: 'Evening',
    joined_date: '2023-03-01',
  },
  {
    id: 'staff-4',
    name: 'Elena Rostova',
    role: 'receptionist',
    employee_code: 'REC-01',
    passcode: 'reception2026',
    phone: '+91 98400 44004',
    email: 'reception@prathomix.com',
    salary: 45000,
    status: 'active',
    shift: 'Morning',
    joined_date: '2024-01-12',
  },
  {
    id: 'staff-5',
    name: 'Marco Vance',
    role: 'waiter',
    employee_code: 'W-1001',
    passcode: 'waiter2026',
    phone: '+91 98500 55005',
    email: 'waiter@prathomix.com',
    salary: 32000,
    status: 'active',
    shift: 'Evening',
    joined_date: '2024-02-20',
  },
  {
    id: 'staff-6',
    name: 'Arjun Das',
    role: 'delivery',
    employee_code: 'DEL-01',
    passcode: 'delivery2026',
    phone: '+91 98600 66006',
    email: 'delivery@prathomix.com',
    salary: 28000,
    status: 'active',
    shift: 'Evening',
    joined_date: '2024-04-05',
  },
];

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  owner: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  admin: { bg: 'bg-[#C5A880]/15', text: 'text-[#C5A880]', border: 'border-[#C5A880]/40' },
  manager: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  receptionist: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30' },
  waiter: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  chef: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  delivery: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  accountant: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  customer: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
};

export default function AdminStaff() {
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('All');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('waiter');
  const [formCode, setFormCode] = useState('');
  const [formPasscode, setFormPasscode] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSalary, setFormSalary] = useState(30000);
  const [formShift, setFormShift] = useState<'Morning' | 'Evening' | 'Double' | 'Off'>('Morning');

  // Filtered
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchQuery =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery);
      const matchRole = selectedRole === 'All' || s.role === selectedRole;
      return matchQuery && matchRole;
    });
  }, [staffList, searchQuery, selectedRole]);

  // Stats
  const stats = useMemo(() => {
    const total = staffList.length;
    const active = staffList.filter((s) => s.status === 'active').length;
    const totalSalary = staffList.reduce((sum, s) => sum + s.salary, 0);
    return { total, active, totalSalary };
  }, [staffList]);

  const roles: Array<string> = ['All', 'owner', 'admin', 'manager', 'receptionist', 'waiter', 'chef', 'delivery'];

  function openAddModal() {
    setSelectedStaff(null);
    setFormName('');
    setFormRole('waiter');
    setFormCode(`W-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormPasscode('pass1234');
    setFormPhone('');
    setFormEmail('');
    setFormSalary(35000);
    setFormShift('Morning');
    setModalOpen(true);
  }

  function openEditModal(staff: StaffMember) {
    setSelectedStaff(staff);
    setFormName(staff.name);
    setFormRole(staff.role);
    setFormCode(staff.employee_code);
    setFormPasscode(staff.passcode);
    setFormPhone(staff.phone);
    setFormEmail(staff.email);
    setFormSalary(staff.salary);
    setFormShift(staff.shift);
    setModalOpen(true);
  }

  function handleSaveStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;

    if (selectedStaff) {
      setStaffList((prev) =>
        prev.map((s) =>
          s.id === selectedStaff.id
            ? {
                ...s,
                name: formName,
                role: formRole,
                employee_code: formCode,
                passcode: formPasscode,
                phone: formPhone,
                email: formEmail,
                salary: formSalary,
                shift: formShift,
              }
            : s
        )
      );
    } else {
      const newStaff: StaffMember = {
        id: `staff-${Date.now()}`,
        name: formName,
        role: formRole,
        employee_code: formCode,
        passcode: formPasscode,
        phone: formPhone,
        email: formEmail,
        salary: formSalary,
        status: 'active',
        shift: formShift,
        joined_date: new Date().toISOString().slice(0, 10),
      };
      setStaffList((prev) => [...prev, newStaff]);
    }
    setModalOpen(false);
  }

  function toggleStaffStatus(id: string) {
    setStaffList((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: s.status === 'active' ? 'suspended' : 'active' } : s
      )
    );
  }

  function handleDeleteStaff(id: string) {
    if (confirm('Are you sure you want to remove this staff profile?')) {
      setStaffList((prev) => prev.filter((s) => s.id !== id));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[#EAE6DF] tracking-wide"
            style={{ fontFamily: 'Cinzel, serif' }}>
            Staff & Role Command
          </h1>
          <p className="text-xs text-[#EAE6DF]/60 mt-1">
            Manage employee access, POS/KDS passcodes, shift rotations & departmental payroll.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs shadow-warm hover:brightness-110 transition-all self-start sm:self-auto">
          <UserPlus className="w-4 h-4" />
          Onboard Staff
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#EAE6DF]/60 uppercase tracking-wider font-semibold">Total Personnel</span>
            <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#EAE6DF] mt-2 font-mono">{stats.total}</div>
          <span className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">Across 7 departments</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#121212]/90 border border-emerald-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">Active & On-Duty</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2 font-mono">{stats.active}</div>
          <span className="text-[10px] text-emerald-400/80 mt-1 flex items-center gap-1">Ready for service</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#EAE6DF]/60 uppercase tracking-wider font-semibold">Monthly Payroll</span>
            <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#C5A880] mt-2 font-mono">
            ₹{stats.totalSalary.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-[#EAE6DF]/50 mt-1 flex items-center gap-1">Allocated compensation</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C5A880]/60" />
          <input
            type="text"
            placeholder="Search by name, employee code (e.g. W-1001), or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-xs text-[#EAE6DF] placeholder:text-[#EAE6DF]/40 focus:outline-none focus:border-[#C5A880]"
          />
        </div>

        {/* Role Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${
                selectedRole === r
                  ? 'bg-[#C5A880] text-[#0A0A0A]'
                  : 'bg-[#1A1A1A] text-[#EAE6DF]/70 hover:text-[#EAE6DF] border border-[#C5A880]/10'
              }`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Table */}
      <div className="rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#C5A880]/15 bg-[#181818] text-[#C5A880] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Role & Badge</th>
                <th className="py-3 px-4">Passcode / PIN</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Shift</th>
                <th className="py-3 px-4">Salary</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C5A880]/10">
              {filteredStaff.map((staff) => {
                const style = ROLE_COLORS[staff.role] || ROLE_COLORS.waiter;

                return (
                  <tr key={staff.id} className="hover:bg-[#1A1A1A]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#EAE6DF]">{staff.name}</div>
                      <div className="text-[10px] text-[#EAE6DF]/50">Joined {staff.joined_date}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
                          {staff.role}
                        </span>
                        <span className="font-mono text-[11px] text-[#C5A880]">{staff.employee_code}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-[#EAE6DF]/80">
                        <KeyRound className="w-3.5 h-3.5 text-[#C5A880]" />
                        <span>{staff.passcode}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-[#EAE6DF] font-medium">{staff.phone}</div>
                      <div className="text-[10px] text-[#EAE6DF]/50">{staff.email}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#2A2A2A] text-[#EAE6DF]">
                        {staff.shift}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-[#EAE6DF]">
                      ₹{staff.salary.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => toggleStaffStatus(staff.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border transition-colors ${
                          staff.status === 'active'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>
                        {staff.status}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(staff)}
                          className="p-1.5 rounded-lg text-[#EAE6DF]/60 hover:text-[#C5A880] hover:bg-[#2A2A2A] transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="p-1.5 rounded-lg text-[#EAE6DF]/60 hover:text-red-400 hover:bg-[#2A2A2A] transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-[#EAE6DF]/50">
                    No staff found matching query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Onboard / Edit Staff */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-[#121212] border border-[#C5A880]/30 shadow-2xl p-6 relative">
              <div className="flex items-center justify-between pb-4 border-b border-[#C5A880]/15">
                <h3
                  className="text-lg font-bold text-[#EAE6DF] tracking-wide"
                  style={{ fontFamily: 'Cinzel, serif' }}>
                  {selectedStaff ? 'Edit Staff Profile' : 'Onboard New Staff Member'}
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-[#EAE6DF]/60 hover:text-[#EAE6DF] hover:bg-[#1A1A1A]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveStaff} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Marco Vance"
                    className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Role Assignment *</label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]">
                      <option value="waiter">Lead Waiter / Server</option>
                      <option value="chef">Executive Chef</option>
                      <option value="receptionist">Reception / Host</option>
                      <option value="manager">Floor Manager</option>
                      <option value="admin">Operations Admin</option>
                      <option value="delivery">Delivery Specialist</option>
                      <option value="accountant">Financial Accountant</option>
                      <option value="owner">Restaurant Owner</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Employee Badge Code *</label>
                    <input
                      type="text"
                      required
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      placeholder="e.g. W-1002"
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] font-mono focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">POS Passcode / PIN *</label>
                    <input
                      type="text"
                      required
                      value={formPasscode}
                      onChange={(e) => setFormPasscode(e.target.value)}
                      placeholder="e.g. waiter2026"
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] font-mono focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Shift Schedule</label>
                    <select
                      value={formShift}
                      onChange={(e) => setFormShift(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]">
                      <option value="Morning">Morning Shift (10am - 4pm)</option>
                      <option value="Evening">Evening Shift (4pm - 12am)</option>
                      <option value="Double">Double Shift</option>
                      <option value="Off">Weekly Off</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Phone Number</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+91 98..."
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Email Address</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="staff@prathomix.com"
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Monthly Compensation (₹)</label>
                  <input
                    type="number"
                    step="1000"
                    value={formSalary}
                    onChange={(e) => setFormSalary(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] font-mono focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[#C5A880]/15">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#1A1A1A] text-[#EAE6DF]/70 hover:bg-[#2A2A2A]">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold shadow-warm hover:brightness-110">
                    Save Profile
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
