import { NextResponse } from 'next/server';
import { RESTAURANT_TABLES, supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';

    // Request dishes with exact count
    const res = await supabase.from(RESTAURANT_TABLES.dishes).select('*', { count: 'exact' });

    if (res.error) {
      return NextResponse.json({ error: res.error.message, supabaseUrl: url }, { status: 500 });
    }

    return NextResponse.json({ supabaseUrl: url, count: res.count ?? 0, sample: (res.data ?? []).slice(0, 3) });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
