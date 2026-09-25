import { NextResponse } from 'next/server';

/**
 * ╔══════════════════════════════════════════════════════╗
 * ║  WHATSAPP NOTIFICATION — MOCK IMPLEMENTATION         ║
 * ║                                                      ║
 * ║  To activate real Twilio WhatsApp:                   ║
 * ║  1. npm install twilio                               ║
 * ║  2. Uncomment the Twilio block below                 ║
 * ║  3. Set env vars in .env.local                       ║
 * ╚══════════════════════════════════════════════════════╝
 */

export async function POST(req: Request) {
  const body = await req.json();
  let message = '';

  if (body.type === 'booking') {
    message = [
      '🍽️ *Prathomix Restaurant — Booking Confirmed!*',
      '',
      `👤 Name   : ${body.name}`,
      `📅 Date   : ${body.date}`,
      `⏰ Time   : ${body.time}`,
      `👥 Guests : ${body.guests}`,
      '',
      'We look forward to seeing you! 🌟',
      'Mi Road, Jaipur · Open 12 PM – 11 PM',
    ].join('\n');
  } else if (body.type === 'order') {
    const dishes = Array.isArray(body.dishes) ? body.dishes.join(', ') : 'your items';
    message = [
      '🛒 *Prathomix — Order Received!*',
      '',
      `🍜 Items : ${dishes}`,
      `💰 Total : ₹${Number(body.amount).toFixed(2)}`,
      '',
      'Your order is being freshly prepared. Thank you! 🙏',
    ].join('\n');
  }

  // ── MOCK: simulate a 300ms network call ──────────────────
  await new Promise((r) => setTimeout(r, 300));

  /* ── PRODUCTION (Twilio) — uncomment this block ──────────
  const twilio = require('twilio');
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,  // e.g. 'whatsapp:+14155238886'
    to:   `whatsapp:+91${body.phone}`,
    body: message,
  });
  ─────────────────────────────────────────────────────────── */

  console.log('[WhatsApp Mock] Message queued:\n', message);

  return NextResponse.json({
    success: true,
    mock:    true,
    message,
  });
}
