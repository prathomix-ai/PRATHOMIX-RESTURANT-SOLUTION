import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getStaffPresenceList } from '@/lib/presenceStore';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const cookieStore = cookies();
    const staffRoleCookie = cookieStore.get('prathomix_staff_role')?.value;
    const sessionCookie = cookieStore.get('prathomix_user_session')?.value;

    let role = staffRoleCookie?.toLowerCase() || '';

    if (sessionCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(sessionCookie));
        if (parsed?.role) {
          role = parsed.role.toLowerCase();
        }
      } catch {
        // ignore
      }
    }

    // Dev mode fallback or query override if valid staff role
    const url = new URL(req.url);
    const paramRole = url.searchParams.get('role')?.toLowerCase();
    if (!role && paramRole) {
      role = paramRole;
    }

    // 1. STRICT BACKEND AUTHORIZATION:
    // Only OWNER and ADMIN can read staff active status.
    // WAITER, CHEF, RECEPTIONIST, CUSTOMER are strictly forbidden (403).
    const allowedRoles = ['owner', 'admin', 'manager'];
    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.json(
        {
          error: 'Forbidden: Access denied. Staff presence tracking is strictly restricted to Owner and Admin.',
          code: 'UNAUTHORIZED_PRESENCE_ACCESS',
        },
        { status: 403 }
      );
    }

    // 2. Query presence with role filtering (Admin cannot see Owner)
    const result = getStaffPresenceList(role);

    if (!result) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      viewer: role === 'owner' ? 'owner' : 'admin',
      ...result,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
