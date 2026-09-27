import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { recordStaffHeartbeat } from '@/lib/presenceStore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // In case of sendBeacon with text payload
      body = {};
    }

    const { userId, userName, userRole, status = 'active' } = body;

    // Verify session from cookies if body is incomplete
    const cookieStore = cookies();
    const staffRoleCookie = cookieStore.get('prathomix_staff_role')?.value;
    const sessionCookie = cookieStore.get('prathomix_user_session')?.value;

    let role = userRole || staffRoleCookie?.toLowerCase() || '';
    let name = userName || 'Staff User';
    let id = userId || 'unknown';

    if (sessionCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(sessionCookie));
        if (parsed?.role) role = parsed.role.toLowerCase();
        if (parsed?.name) name = parsed.name;
        if (parsed?.id) id = parsed.id;
      } catch {
        // ignore
      }
    }

    // Customer or unauthenticated sessions do NOT generate staff heartbeats
    if (!role || role === 'customer') {
      return NextResponse.json({ success: false, ignored: true });
    }

    recordStaffHeartbeat(id, name, role, status);

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Heartbeat error' }, { status: 500 });
  }
}
