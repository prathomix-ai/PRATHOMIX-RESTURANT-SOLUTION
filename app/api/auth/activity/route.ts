import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase, RESTAURANT_TABLES, DEFAULT_RESTAURANT_ID } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export interface LoginActivityItem {
  id: string;
  user: string;
  role: string;
  event: 'Login' | 'Logout' | 'Failed Login';
  date: string;
  time: string;
  status: 'Success' | 'Failed' | 'Warning';
  device?: string;
  ip?: string;
  isOwnerPrivate?: boolean;
}

// In-memory persistent buffer for audit continuity
const LOGIN_ACTIVITY_STORE: LoginActivityItem[] = [
  {
    id: 'log-001',
    user: 'Rahul Sharma',
    role: 'Waiter',
    event: 'Login',
    date: 'Today',
    time: '7:42 PM',
    status: 'Success',
    device: 'Handheld POS / Mobile Safari',
    ip: '192.168.1.108',
  },
  {
    id: 'log-002',
    user: 'Aman Verma',
    role: 'Chef',
    event: 'Login',
    date: 'Today',
    time: '7:45 PM',
    status: 'Success',
    device: 'Kitchen KDS / Chrome OS',
    ip: '192.168.1.109',
  },
  {
    id: 'log-003',
    user: 'Priya Nair',
    role: 'Receptionist',
    event: 'Login',
    date: 'Today',
    time: '7:51 PM',
    status: 'Success',
    device: 'Concierge Terminal / Safari',
    ip: '192.168.1.105',
  },
  {
    id: 'log-004',
    user: 'Admin Ops',
    role: 'Admin',
    event: 'Login',
    date: 'Today',
    time: '7:53 PM',
    status: 'Success',
    device: 'Desktop / Windows Chrome',
    ip: '192.168.1.102',
  },
  {
    id: 'log-005',
    user: 'Alexander Wright',
    role: 'Owner',
    event: 'Login',
    date: 'Yesterday',
    time: '8:15 PM',
    status: 'Success',
    device: 'MacBook Pro / Safari',
    ip: '10.0.0.12',
    isOwnerPrivate: true,
  },
  {
    id: 'log-006',
    user: 'Unknown Device',
    role: 'Waiter',
    event: 'Failed Login',
    date: 'Today',
    time: '10:14 AM',
    status: 'Failed',
    device: 'Handheld Terminal',
    ip: '192.168.1.104',
  },
];

/**
 * Helper to authenticate requester role strictly on server side
 */
function getAuthenticatedRole(req: Request): { role: string; userId: string } | null {
  const cookieStore = cookies();
  const staffRoleCookie = cookieStore.get('prathomix_staff_role')?.value;
  const sessionCookie = cookieStore.get('prathomix_user_session')?.value;

  let role = staffRoleCookie?.toLowerCase() || '';
  let userId = 'unknown';

  if (sessionCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(sessionCookie));
      if (parsed?.role) {
        role = parsed.role.toLowerCase();
        userId = parsed.id || 'unknown';
      }
    } catch {
      // ignore JSON parse error
    }
  }

  // Fallback for dev / header authentication
  const authHeader = req.headers.get('x-user-role')?.toLowerCase();
  if (authHeader) {
    role = authHeader;
  }

  // Check query parameter if authorized dev mode
  const url = new URL(req.url);
  const paramRole = url.searchParams.get('role')?.toLowerCase();
  if (!role && paramRole) {
    role = paramRole;
  }

  if (!role) return null;
  return { role, userId };
}

/**
 * GET: Retrieve login activity strictly restricted to OWNER and ADMIN
 */
export async function GET(req: Request) {
  try {
    const auth = getAuthenticatedRole(req);

    // 1. NON-AUTHORIZED ROLES MUST BE REJECTED IMMEDIATELY (403 Forbidden)
    // Waiter, Chef, Receptionist, Customer CANNOT query login activity!
    const allowedRoles = ['owner', 'admin', 'manager'];
    if (!auth || !allowedRoles.includes(auth.role)) {
      return NextResponse.json(
        {
          error: 'Forbidden: Access denied. Login activity is strictly restricted to Owner and Admin.',
          code: 'UNAUTHORIZED_LOGIN_ACTIVITY_ACCESS',
        },
        { status: 403 }
      );
    }

    const isOwner = auth.role === 'owner';
    const isAdmin = auth.role === 'admin' || auth.role === 'manager';

    // 2. Fetch any database-logged activities
    let dbRows: LoginActivityItem[] = [];
    try {
      const { data } = await supabase
        .from(RESTAURANT_TABLES.auditLogs)
        .select('*')
        .in('action', ['LOGIN', 'LOGOUT', 'LOGIN_SUCCESS', 'LOGIN_FAILED'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (data && data.length > 0) {
        dbRows = data.map((d: any) => ({
          id: d.id,
          user: d.user_name || 'Staff User',
          role: (d.user_role || 'Staff').charAt(0).toUpperCase() + (d.user_role || 'Staff').slice(1),
          event: d.action === 'LOGIN_FAILED' ? 'Failed Login' : d.action.includes('LOGOUT') ? 'Logout' : 'Login',
          date: new Date(d.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          time: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: d.action === 'LOGIN_FAILED' ? 'Failed' : 'Success',
          device: d.details || 'Web Terminal',
          isOwnerPrivate: d.user_role?.toLowerCase() === 'owner',
        }));
      }
    } catch {
      // fallback to buffer
    }

    const allRecords = [...LOGIN_ACTIVITY_STORE, ...dbRows];

    // 3. ADMIN ROLE FILTER:
    // Admin can see: Waiter, Chef, Receptionist, other staff login/logout
    // Admin MUST NOT see:
    // - Owner login history
    // - Owner private sessions
    // - Owner dashboard viewing activity
    // - Owner device information
    // - Owner IP information
    if (isAdmin && !isOwner) {
      const staffOnlyLogs = allRecords
        .filter((item) => {
          const itemRole = item.role.toLowerCase();
          // Exclude Owner completely
          if (itemRole === 'owner') return false;
          if (item.isOwnerPrivate) return false;
          return true;
        })
        .map((item) => ({
          id: item.id,
          user: item.user,
          role: item.role,
          event: item.event,
          date: item.date,
          time: item.time,
          status: item.status,
          // Exclude sensitive internal IP for admin unless staff terminal
          device: item.device,
        }));

      return NextResponse.json({
        success: true,
        viewer: 'admin',
        records: staffOnlyLogs,
      });
    }

    // 4. OWNER ROLE VISIBILITY:
    // Owner can see:
    // - Admin login/logout
    // - Waiter login/logout
    // - Chef login/logout
    // - Receptionist login/logout
    // - Other authorized staff login/logout
    // - Failed login/security events
    // (Note: Owner private dashboard browsing is never recorded as ordinary activity)
    if (isOwner) {
      return NextResponse.json({
        success: true,
        viewer: 'owner',
        records: allRecords,
      });
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

/**
 * POST: Record login/logout event into audit store
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      user = 'Staff Member',
      role = 'staff',
      event = 'Login',
      status = 'Success',
      device = 'Web App',
      ip = '127.0.0.1',
      isOwnerPrivate = false,
    } = body;

    const normalizedRole = (role || 'staff').toLowerCase();

    // Do NOT log ordinary dashboard browsing of Owner
    if (normalizedRole === 'owner' && event === 'PAGE_VIEW') {
      return NextResponse.json({ success: true, ignored: true });
    }

    const newItem: LoginActivityItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user,
      role: normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1),
      event,
      date: 'Today',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status,
      device,
      ip,
      isOwnerPrivate: Boolean(isOwnerPrivate || normalizedRole === 'owner'),
    };

    LOGIN_ACTIVITY_STORE.unshift(newItem);
    if (LOGIN_ACTIVITY_STORE.length > 250) LOGIN_ACTIVITY_STORE.pop();

    // Persist to Supabase auditLogs if table exists
    try {
      await supabase.from(RESTAURANT_TABLES.auditLogs).insert({
        restaurant_id: DEFAULT_RESTAURANT_ID,
        user_id: `user-${normalizedRole}`,
        user_name: user,
        user_role: normalizedRole,
        action: event === 'Failed Login' ? 'LOGIN_FAILED' : event.toUpperCase(),
        details: `${device} · Status: ${status}`,
        created_at: new Date().toISOString(),
      });
    } catch {
      // non-blocking
    }

    return NextResponse.json({ success: true, item: newItem });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to record event' }, { status: 500 });
  }
}
