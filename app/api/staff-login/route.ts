import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  const body = await req.json();
  const incomingRole = String(body?.role ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');
  const role = incomingRole;

  if (!role || !password) {
    return NextResponse.json({ error: 'Missing role or password' }, { status: 400 });
  }

  const configuredReceptionPassword = process.env.RECEPTION_PASSWORD ?? '';
  if (role === 'reception' && configuredReceptionPassword && password === configuredReceptionPassword) {
    return NextResponse.json({ ok: true, role, source: 'env' });
  }

  const { data, error } = await supabase.rpc('verify_staff_access', {
    p_role: role,
    p_code: password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Incorrect password. Access denied.' }, { status: 401 });
  }

  return NextResponse.json({ ok: true, role, source: 'rpc' });
}