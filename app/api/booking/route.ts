import { NextResponse } from 'next/server';
import { RESTAURANT_TABLES, supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  const body = await req.json();
  const { customer_name, phone, date, time, guests, notes } = body;

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

  const { data, error } = await supabase
    .from(RESTAURANT_TABLES.bookings)
    .insert({
      customer_name,
      phone,
      date,
      time,
      guests: guestCount,
      notes:  notes ?? '',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function GET() {
  const { data, error } = await supabase
    .from(RESTAURANT_TABLES.bookings)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
