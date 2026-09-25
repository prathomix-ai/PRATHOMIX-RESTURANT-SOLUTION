import { NextResponse } from 'next/server';
import { getOrCreateTableSession, validateTableSession } from '@/lib/tableSession';
import { verifyQrToken } from '@/lib/qrToken';
import { supabase, RESTAURANT_TABLES, DEFAULT_RESTAURANT_ID } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      restaurant_id = DEFAULT_RESTAURANT_ID,
      table_number,
      qr_token,
      session_token,
      device_fingerprint,
      customer_name,
      customer_phone,
    } = body;

    if (!table_number || Number(table_number) < 1) {
      return NextResponse.json({ error: 'Valid table number is required' }, { status: 400 });
    }

    const tableNum = Number(table_number);

    // 1. Verify Table State in Restaurant
    const { data: tableData } = await supabase
      .from(RESTAURANT_TABLES.restaurantTables)
      .select('status')
      .eq('restaurant_id', restaurant_id)
      .eq('table_number', tableNum)
      .single();

    if (tableData) {
      const invalid = ['cleaning', 'closed', 'blocked'];
      if (invalid.includes(tableData.status?.toLowerCase())) {
        return NextResponse.json(
          {
            error: `Table ${tableNum} is currently ${tableData.status}. Please request table assignment from reception.`,
            table_status: tableData.status,
          },
          { status: 403 }
        );
      }
    }

    // 2. Validate QR Token if provided (or fallback if simple token)
    if (qr_token) {
      const qrCheck = verifyQrToken(restaurant_id, tableNum, qr_token);
      if (!qrCheck.valid) {
        return NextResponse.json(
          { error: qrCheck.reason || 'Invalid or expired Table QR code. Please scan the standee on your table.' },
          { status: 401 }
        );
      }
    }

    // 3. Create or Resume Active Session
    const session = await getOrCreateTableSession({
      restaurantId: restaurant_id,
      tableNumber: tableNum,
      sessionToken: session_token,
      deviceFingerprint: device_fingerprint,
      customerName: customer_name,
      customerPhone: customer_phone,
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        session_token: session.session_token,
        table_number: session.table_number,
        status: session.status,
        is_trusted: session.is_trusted,
        expires_at: session.expires_at,
      },
    });
  } catch (err: any) {
    console.error('Session creation error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to establish table session' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionToken = url.searchParams.get('session_token') || undefined;
    const tableNumber = url.searchParams.get('table') ? Number(url.searchParams.get('table')) : undefined;
    const restaurantId = url.searchParams.get('restaurant_id') || DEFAULT_RESTAURANT_ID;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Missing session_token' }, { status: 400 });
    }

    const result = await validateTableSession(sessionToken, tableNumber, restaurantId);

    if (!result.valid) {
      return NextResponse.json({ valid: false, error: result.reason }, { status: 403 });
    }

    return NextResponse.json({
      valid: true,
      session: {
        id: result.session?.id,
        session_token: result.session?.session_token,
        table_number: result.session?.table_number,
        status: result.session?.status,
        is_trusted: result.session?.is_trusted,
        expires_at: result.session?.expires_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to validate session' }, { status: 500 });
  }
}
