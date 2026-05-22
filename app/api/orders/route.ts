import { NextResponse } from 'next/server';
import { RESTAURANT_TABLES, supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  const body = await req.json();
  const { dish_ids, dish_names, total_amount, split_count, table_number } = body;

  if (!dish_ids?.length || !total_amount || !table_number) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const baseOrder = {
    dish_ids,
    dish_names,
    total_amount,
    split_count: split_count ?? 1,
  };

  const tryInsert = async (payload: Record<string, unknown>) => supabase
    .from(RESTAURANT_TABLES.orders)
    .insert(payload)
    .select()
    .single();

  let result = await tryInsert({ ...baseOrder, table_number });

  if (result.error?.message.includes("Could not find the 'table_number' column")) {
    result = await tryInsert(baseOrder);
  }

  const { data, error } = result;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function GET() {
  const { data, error } = await supabase
    .from(RESTAURANT_TABLES.orders)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { order_id, status } = body;

  if (!order_id || !status) {
    return NextResponse.json({ error: 'Missing order_id or status' }, { status: 400 });
  }

  const validStatuses = ['placed', 'preparing', 'ready', 'served'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from(RESTAURANT_TABLES.orders)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', order_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
