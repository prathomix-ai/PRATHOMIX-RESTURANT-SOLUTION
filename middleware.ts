import { NextResponse, type NextRequest } from 'next/server';

const ROLE_DASHBOARDS: Record<string, string> = {
  owner: '/admin',
  admin: '/admin',
  manager: '/admin',
  receptionist: '/reception/dashboard',
  reception: '/reception/dashboard',
  waiter: '/waiter/dashboard',
  chef: '/kitchen/dashboard',
  kitchen: '/kitchen/dashboard',
  delivery: '/delivery/dashboard',
  customer: '/',
  accountant: '/admin',
};

const ROUTE_PERMISSIONS: Array<{
  prefix: string;
  allowedRoles: string[];
  loginFallback: string;
}> = [
  {
    prefix: '/admin',
    allowedRoles: ['owner', 'admin', 'manager', 'accountant'],
    loginFallback: '/login?redirect=/admin',
  },
  {
    prefix: '/waiter/dashboard',
    allowedRoles: ['waiter', 'owner', 'admin', 'manager'],
    loginFallback: '/login?redirect=/waiter/dashboard',
  },
  {
    prefix: '/reception/dashboard',
    allowedRoles: ['receptionist', 'reception', 'owner', 'admin', 'manager'],
    loginFallback: '/login?redirect=/reception/dashboard',
  },
  {
    prefix: '/kitchen/dashboard',
    allowedRoles: ['chef', 'kitchen', 'owner', 'admin', 'manager'],
    loginFallback: '/login?redirect=/kitchen/dashboard',
  },
  {
    prefix: '/delivery',
    allowedRoles: ['delivery', 'owner', 'admin', 'manager'],
    loginFallback: '/login?redirect=/delivery/dashboard',
  },
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read staff role and user session from cookies
  const roleCookie = request.cookies.get('prathomix_staff_role')?.value;
  const sessionCookie = request.cookies.get('prathomix_user_session')?.value;

  let userRole = roleCookie?.toLowerCase() || '';
  if (!userRole && sessionCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(sessionCookie));
      userRole = parsed?.role?.toLowerCase() || '';
    } catch {
      // ignore parsing error
    }
  }

  // Check matching protected routes
  for (const route of ROUTE_PERMISSIONS) {
    if (pathname === route.prefix || pathname.startsWith(route.prefix + '/')) {
      // 1. If not authenticated at all -> redirect to login
      if (!userRole) {
        const loginUrl = new URL(route.loginFallback, request.url);
        return NextResponse.redirect(loginUrl);
      }

      // 2. If authenticated but role is not authorized for this section -> redirect to their authorized dashboard
      if (!route.allowedRoles.includes(userRole)) {
        const correctHome = ROLE_DASHBOARDS[userRole] || '/';
        const deniedUrl = new URL(correctHome, request.url);
        deniedUrl.searchParams.set('access_denied', 'true');
        return NextResponse.redirect(deniedUrl);
      }
    }
  }

  // Handle legacy login route redirects if already logged in with matching role
  if (pathname === '/kitchen/login' && (userRole === 'kitchen' || userRole === 'chef')) {
    return NextResponse.redirect(new URL('/kitchen/dashboard', request.url));
  }
  if (pathname === '/waiter/login' && userRole === 'waiter') {
    return NextResponse.redirect(new URL('/waiter/dashboard', request.url));
  }
  if (pathname === '/reception' && (userRole === 'reception' || userRole === 'receptionist')) {
    return NextResponse.redirect(new URL('/reception/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/waiter/dashboard/:path*',
    '/reception/dashboard/:path*',
    '/kitchen/dashboard/:path*',
    '/delivery/:path*',
    '/kitchen/login',
    '/waiter/login',
    '/reception',
  ],
};