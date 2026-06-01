import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const kitchenRole = request.cookies.get('prathomix_staff_role')?.value;
  const waiterRole = request.cookies.get('prathomix_staff_role')?.value;

  if (pathname.startsWith('/kitchen/login')) {
    if (kitchenRole === 'kitchen') {
      return NextResponse.redirect(new URL('/kitchen', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/kitchen')) {
    if (kitchenRole !== 'kitchen') {
      return NextResponse.redirect(new URL('/kitchen/login', request.url));
    }
  }

  if (pathname.startsWith('/waiter/login')) {
    if (waiterRole === 'waiter') {
      return NextResponse.redirect(new URL('/waiter', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/waiter')) {
    if (waiterRole !== 'waiter') {
      return NextResponse.redirect(new URL('/waiter/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/kitchen/:path*', '/waiter/:path*'],
};