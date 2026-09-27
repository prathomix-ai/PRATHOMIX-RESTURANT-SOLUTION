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
  exclude?: string[];
}> = [
  {
    prefix: '/owner',
    allowedRoles: ['owner'],
    loginFallback: '/login?redirect=/admin',
  },
  {
    prefix: '/admin',
    allowedRoles: ['owner', 'admin', 'manager', 'accountant'],
    loginFallback: '/login?redirect=/admin',
  },
  {
    prefix: '/waiter',
    allowedRoles: ['waiter', 'owner', 'admin', 'manager'],
    loginFallback: '/login?redirect=/waiter/dashboard',
    exclude: ['/waiter/login'],
  },
  {
    prefix: '/kitchen',
    allowedRoles: ['chef', 'kitchen', 'owner', 'admin', 'manager'],
    loginFallback: '/login?redirect=/kitchen/dashboard',
    exclude: ['/kitchen/login'],
  },
  {
    prefix: '/chef',
    allowedRoles: ['chef', 'kitchen', 'owner', 'admin', 'manager'],
    loginFallback: '/login?redirect=/kitchen/dashboard',
  },
  {
    prefix: '/reception/dashboard',
    allowedRoles: ['receptionist', 'reception', 'owner', 'admin', 'manager'],
    loginFallback: '/reception',
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
      if (route.exclude && route.exclude.some((ex) => pathname === ex || pathname.startsWith(ex + '/'))) {
        continue;
      }

      // 1. If not authenticated at all -> redirect to login
      if (!userRole) {
        const loginUrl = new URL(route.loginFallback, request.url);
        return NextResponse.redirect(loginUrl);
      }

      // 2. If authenticated as customer or non-authorized role -> strictly block
      if (!route.allowedRoles.includes(userRole)) {
        const correctHome = ROLE_DASHBOARDS[userRole] || '/';
        const deniedUrl = new URL(correctHome, request.url);
        deniedUrl.searchParams.set('access_denied', 'true');
        return NextResponse.redirect(deniedUrl);
      }
    }
  }

  // Handle redirects for convenience paths
  if (pathname === '/owner' && userRole === 'owner') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }
  if (pathname === '/chef' && (userRole === 'chef' || userRole === 'kitchen' || userRole === 'owner' || userRole === 'admin')) {
    return NextResponse.redirect(new URL('/kitchen/dashboard', request.url));
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
    '/owner/:path*',
    '/owner',
    '/admin/:path*',
    '/admin',
    '/waiter/:path*',
    '/waiter',
    '/kitchen/:path*',
    '/kitchen',
    '/chef/:path*',
    '/chef',
    '/reception/dashboard/:path*',
    '/delivery/:path*',
    '/kitchen/login',
    '/waiter/login',
    '/reception',
  ],
};