import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.set('prathomix_staff_role', '', { path: '/', maxAge: 0 });
  response.cookies.set('prathomix_user_session', '', { path: '/', maxAge: 0 });
  return response;
}
