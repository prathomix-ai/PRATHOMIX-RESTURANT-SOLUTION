import { NextResponse } from 'next/server';
import { RESTAURANT_SEED_DISHES, RESTAURANT_TABLES, supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from(RESTAURANT_TABLES.dishes)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data && data.length > 0) ? data : RESTAURANT_SEED_DISHES);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await supabase
    .from(RESTAURANT_TABLES.dishes)
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
