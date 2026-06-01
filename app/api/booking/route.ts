import { NextResponse } from 'next/server';
import { RESTAURANT_TABLES, supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  const body = await req.json();
  const { customer_name, phone, date, time, guests, notes, table_number, status } = body;

  if (!customer_name || !phone || !date || !time || !guests) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const selectedDate = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(selectedDate.getTime()) || selectedDate < today) {
    return NextResponse.json({ error: 'Reservation date cannot be in the past.' }, { status: 400 });
  }

  const guestCount = Number(guests);
  if (Number.isNaN(guestCount) || guestCount < 1 || guestCount > 20) {
    return NextResponse.json({ error: 'Guest count must be between 1 and 20.' }, { status: 400 });
  }

  const assignedTableNumber = table_number == null || table_number === '' ? null : Number(table_number);
  if (assignedTableNumber != null && (Number.isNaN(assignedTableNumber) || assignedTableNumber < 1)) {
    return NextResponse.json({ error: 'Invalid table number.' }, { status: 400 });
  }

  const bookingStatus = String(status ?? 'reserved').trim().toLowerCase();
  const allowedStatuses = ['reserved', 'seated', 'completed', 'confirmed', 'pending', 'cancelled'];
  if (!allowedStatuses.includes(bookingStatus)) {
    return NextResponse.json({ error: 'Invalid booking status.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from(RESTAURANT_TABLES.bookings)
    .insert({
      customer_name,
      phone,
      date,
      time,
      guests: guestCount,
      table_number: assignedTableNumber,
      status: bookingStatus,
      notes:  notes ?? '',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function GET() {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from(RESTAURANT_TABLES.bookings)
    .select('*')
    .eq('date', today)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const bookingId = String(body?.booking_id ?? '').trim();
  const status = String(body?.status ?? '').trim().toLowerCase();
  const tableNumber = body?.table_number === '' || body?.table_number == null ? null : Number(body?.table_number);

  if (!bookingId || !status) {
    return NextResponse.json({ error: 'Missing booking_id or status' }, { status: 400 });
  }

  const validStatuses = ['seated', 'completed', 'cancelled'];
  const normalizedStatus = status;

  if (!validStatuses.includes(normalizedStatus)) {
    return NextResponse.json({ error: 'Invalid booking status' }, { status: 400 });
  }

  if (tableNumber != null && (Number.isNaN(tableNumber) || tableNumber < 1)) {
    return NextResponse.json({ error: 'Invalid table number' }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = { status: normalizedStatus };
  if (tableNumber !== null) updatePayload.table_number = tableNumber;
  if (normalizedStatus === 'completed') updatePayload.table_number = null;

  const { data, error } = await supabase
    .from(RESTAURANT_TABLES.bookings)
    .update(updatePayload)
    .eq('id', bookingId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
