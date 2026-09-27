export interface StaffPresenceItem {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'waiter' | 'chef' | 'receptionist';
  status: 'active' | 'away' | 'inactive';
  lastHeartbeat: number; // Unix ms
  lastSeenFormatted: string;
}

// Initial seed presence state for staff members
const INITIAL_STAFF_PRESENCE: StaffPresenceItem[] = [
  {
    id: 'staff-waiter-1',
    name: 'Rahul Sharma',
    role: 'waiter',
    status: 'active',
    lastHeartbeat: Date.now() - 4000, // 4 sec ago
    lastSeenFormatted: 'Just now',
  },
  {
    id: 'staff-waiter-2',
    name: 'Amit Patel',
    role: 'waiter',
    status: 'inactive',
    lastHeartbeat: Date.now() - 1000 * 60 * 45, // 45 mins ago
    lastSeenFormatted: 'Today, 1:15 PM',
  },
  {
    id: 'staff-chef-1',
    name: 'Aman Verma',
    role: 'chef',
    status: 'active',
    lastHeartbeat: Date.now() - 18000, // 18 sec ago
    lastSeenFormatted: '18 sec ago',
  },
  {
    id: 'staff-chef-2',
    name: 'Ravi Kumar',
    role: 'chef',
    status: 'inactive',
    lastHeartbeat: Date.now() - 1000 * 60 * 120, // 2 hours ago
    lastSeenFormatted: 'Today, 12:04 PM',
  },
  {
    id: 'staff-reception-1',
    name: 'Priya Nair',
    role: 'receptionist',
    status: 'inactive',
    lastHeartbeat: Date.now() - 1000 * 60 * 22, // 22 mins ago
    lastSeenFormatted: 'Today, 6:42 PM',
  },
  {
    id: 'staff-reception-2',
    name: 'Neha Singh',
    role: 'receptionist',
    status: 'active',
    lastHeartbeat: Date.now() - 12000, // 12 sec ago
    lastSeenFormatted: '12 sec ago',
  },
  {
    id: 'staff-admin-1',
    name: 'Admin Ops',
    role: 'admin',
    status: 'active',
    lastHeartbeat: Date.now() - 8000, // 8 sec ago
    lastSeenFormatted: '8 sec ago',
  },
  {
    id: 'staff-owner-1',
    name: 'Alexander Wright',
    role: 'owner',
    status: 'active',
    lastHeartbeat: Date.now() - 5000, // 5 sec ago
    lastSeenFormatted: 'Just now',
  },
];

// In-memory store
const presenceMap = new Map<string, StaffPresenceItem>();

// Initialize
INITIAL_STAFF_PRESENCE.forEach((item) => presenceMap.set(item.id, { ...item }));

/**
 * Update staff heartbeat from active terminal
 */
export function recordStaffHeartbeat(
  userId: string,
  name?: string,
  role?: string,
  status: 'active' | 'away' | 'offline' = 'active'
): void {
  if (!userId) return;

  const now = Date.now();
  const existing = presenceMap.get(userId);

  if (existing) {
    existing.lastHeartbeat = now;
    existing.status = status === 'offline' ? 'inactive' : status;
    if (name) existing.name = name;
    if (role) existing.role = role.toLowerCase() as any;
  } else {
    // Register dynamically if staff
    const cleanRole = (role || 'waiter').toLowerCase() as any;
    presenceMap.set(userId, {
      id: userId,
      name: name || 'Staff Member',
      role: cleanRole,
      status: status === 'offline' ? 'inactive' : status,
      lastHeartbeat: now,
      lastSeenFormatted: 'Just now',
    });
  }
}

/**
 * Retrieve staff presence list with strict role authorization and Owner privacy
 */
export function getStaffPresenceList(requesterRole: string): {
  presence: Array<{
    id: string;
    name: string;
    role: string;
    status: 'active' | 'away' | 'inactive';
    lastActivityText: string;
    lastSeen: string;
  }>;
  counts: { active: number; inactive: number; away: number; total: number };
} | null {
  const normRole = (requesterRole || '').toLowerCase();
  const isOwner = normRole === 'owner';
  const isAdmin = normRole === 'admin' || normRole === 'manager';

  // Strictly restricted to OWNER and ADMIN
  if (!isOwner && !isAdmin) {
    return null;
  }

  const now = Date.now();
  const allStaff = Array.from(presenceMap.values());

  const processed = allStaff
    .filter((staff) => {
      // CRITICAL: ADMIN must NOT see Owner's private online/presence status!
      if (!isOwner && staff.role === 'owner') {
        return false;
      }
      return true;
    })
    .map((staff) => {
      const elapsedSeconds = Math.max(0, Math.floor((now - staff.lastHeartbeat) / 1000));

      let currentStatus: 'active' | 'away' | 'inactive' = 'inactive';
      let lastActivityText = '';

      if (staff.status === 'inactive') {
        currentStatus = 'inactive';
        lastActivityText = staff.lastSeenFormatted;
      } else if (elapsedSeconds <= 45) {
        // Within 45s heartbeat window
        currentStatus = staff.status === 'away' ? 'away' : 'active';
        lastActivityText =
          currentStatus === 'away'
            ? 'Away / Idle'
            : elapsedSeconds <= 5
              ? 'Just now'
              : `${elapsedSeconds} sec ago`;
      } else if (elapsedSeconds <= 90) {
        // Slight network delay / idle
        currentStatus = 'away';
        lastActivityText = `${Math.floor(elapsedSeconds / 60)} min ago`;
      } else {
        // Timeout expired => mark Inactive
        currentStatus = 'inactive';
        const mins = Math.floor(elapsedSeconds / 60);
        lastActivityText = mins < 60 ? `${mins} minutes ago` : staff.lastSeenFormatted;
      }

      return {
        id: staff.id,
        name: staff.name,
        role: staff.role,
        status: currentStatus,
        lastActivityText: currentStatus === 'active' ? `Last activity: ${lastActivityText}` : currentStatus === 'away' ? `Idle: ${lastActivityText}` : `Last seen: ${lastActivityText}`,
        lastSeen: staff.lastSeenFormatted,
      };
    });

  const activeCount = processed.filter((s) => s.status === 'active').length;
  const awayCount = processed.filter((s) => s.status === 'away').length;
  const inactiveCount = processed.filter((s) => s.status === 'inactive').length;

  return {
    presence: processed,
    counts: {
      active: activeCount,
      away: awayCount,
      inactive: inactiveCount,
      total: processed.length,
    },
  };
}
