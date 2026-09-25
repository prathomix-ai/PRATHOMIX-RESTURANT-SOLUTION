import { NextResponse } from 'next/server';
import { supabase, RESTAURANT_TABLES, DEFAULT_RESTAURANT_ID, type UserRole } from '@/lib/supabase';
import { DEMO_ACCOUNTS, ROLE_REDIRECTS, type AuthUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, employee_code, passcode, quick_role } = body;

    const cleanEmail = email ? String(email).trim().toLowerCase() : '';
    const cleanPassword = password ? String(password).trim() : '';
    const cleanCode = employee_code ? String(employee_code).trim().toUpperCase() : '';
    const cleanPasscode = passcode ? String(passcode).trim() : '';

    let matchedUser: AuthUser | null = null;

    // 1. Check quick demo login accounts for testing & reviewer convenience
    if (quick_role) {
      const demo = DEMO_ACCOUNTS.find((acc) => acc.role === quick_role);
      if (demo) {
        matchedUser = {
          id: `demo-${demo.role}-001`,
          restaurant_id: DEFAULT_RESTAURANT_ID,
          role: demo.role,
          name: demo.name,
          email: demo.email,
          employee_code: demo.employee_code,
          status: 'active',
        };
      }
    }

    // 2. Check employee code / passcode login (e.g. Waiter W-1001, Reception REC-01)
    if (!matchedUser && cleanCode) {
      // Check in demo accounts first
      const demo = DEMO_ACCOUNTS.find(
        (acc) => acc.employee_code?.toUpperCase() === cleanCode && (acc.passcode === cleanPasscode || !cleanPasscode)
      );
      if (demo) {
        matchedUser = {
          id: `demo-${demo.role}-${cleanCode}`,
          restaurant_id: DEFAULT_RESTAURANT_ID,
          role: demo.role,
          name: demo.name,
          email: demo.email,
          employee_code: cleanCode,
          status: 'active',
        };
      } else {
        // Query database staff_profiles
        const { data, error } = await supabase
          .from(RESTAURANT_TABLES.staffProfiles)
          .select('*')
          .eq('employee_code', cleanCode)
          .maybeSingle();

        if (data && (!data.passcode || data.passcode === cleanPasscode || !cleanPasscode)) {
          const role = (data.role?.toLowerCase() || 'waiter') as UserRole;
          matchedUser = {
            id: data.id,
            restaurant_id: DEFAULT_RESTAURANT_ID,
            role,
            name: data.name,
            email: `${cleanCode.toLowerCase()}@prathomix.internal`,
            phone: data.phone,
            employee_code: data.employee_code,
            status: 'active',
          };
        }
      }
    }

    // 3. Check email & password credentials
    if (!matchedUser && cleanEmail && cleanPassword) {
      // Check demo accounts
      const demo = DEMO_ACCOUNTS.find(
        (acc) => acc.email.toLowerCase() === cleanEmail && acc.passcode === cleanPassword
      );
      if (demo) {
        matchedUser = {
          id: `demo-${demo.role}-001`,
          restaurant_id: DEFAULT_RESTAURANT_ID,
          role: demo.role,
          name: demo.name,
          email: demo.email,
          employee_code: demo.employee_code,
          status: 'active',
        };
      } else {
        // Query profiles table
        const { data: profile } = await supabase
          .from(RESTAURANT_TABLES.profiles)
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (profile && profile.passcode === cleanPassword) {
          matchedUser = {
            id: profile.id,
            restaurant_id: profile.restaurant_id || DEFAULT_RESTAURANT_ID,
            role: profile.role,
            name: profile.name,
            email: profile.email || cleanEmail,
            phone: profile.phone,
            status: profile.status || 'active',
          };
        }
      }
    }

    // 4. Check legacy staff_access passcodes (e.g. prathomix2024, reception2026, kitchen2026)
    if (!matchedUser && cleanPassword) {
      if (cleanPassword === 'prathomix2024') {
        matchedUser = {
          id: 'admin-legacy-001',
          restaurant_id: DEFAULT_RESTAURANT_ID,
          role: 'admin',
          name: 'Executive Admin',
          email: 'admin@prathomix.tech',
          status: 'active',
        };
      } else if (cleanPassword === 'reception2026') {
        matchedUser = {
          id: 'reception-legacy-001',
          restaurant_id: DEFAULT_RESTAURANT_ID,
          role: 'receptionist',
          name: 'Front Desk Host',
          email: 'reception@prathomix.com',
          status: 'active',
        };
      } else if (cleanPassword === 'kitchen2026') {
        matchedUser = {
          id: 'kitchen-legacy-001',
          restaurant_id: DEFAULT_RESTAURANT_ID,
          role: 'chef',
          name: 'Head Chef',
          email: 'chef@prathomix.com',
          status: 'active',
        };
      }
    }

    if (!matchedUser) {
      return NextResponse.json(
        { error: 'Invalid email/password or employee code. Please verify credentials and try again.' },
        { status: 401 }
      );
    }

    const redirectTo = ROLE_REDIRECTS[matchedUser.role] || '/';

    const response = NextResponse.json({
      success: true,
      user: matchedUser,
      redirectTo,
    });

    // Set cookie headers
    response.cookies.set('prathomix_staff_role', matchedUser.role, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
      httpOnly: false,
    });

    response.cookies.set('prathomix_user_session', JSON.stringify(matchedUser), {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      httpOnly: false,
    });

    return response;
  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: error?.message || 'Login failed' }, { status: 500 });
  }
}
