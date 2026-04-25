import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { supabase } from '@/lib/supabase';

export async function GET() {
  // ── Fetch raw data in parallel ──────────────────────────
  const [dishRes, bookRes, orderRes] = await Promise.all([
    supabase.from('dishes').select('name, price, calories, protein, category'),
    supabase.from('bookings').select('customer_name, date, time, guests, status').order('created_at', { ascending: false }).limit(20),
    supabase.from('orders').select('total_amount, split_count, created_at').order('created_at', { ascending: false }).limit(20),
  ]);

  const dishes   = dishRes.data   ?? [];
  const bookings = bookRes.data   ?? [];
  const orders   = orderRes.data  ?? [];

  // ── Compute basic stats ─────────────────────────────────
  const stats = {
    dishes:      dishes.length,
    bookings:    bookings.length,
    orders:      orders.length,
    avgProtein:  dishes.length
      ? dishes.reduce((s: number, d: any) => s + (d.protein ?? 0), 0) / dishes.length
      : 0,
    totalRevenue: orders.reduce((s: number, o: any) => s + (o.total_amount ?? 0), 0),
    avgGuests:   bookings.length
      ? bookings.reduce((s: number, b: any) => s + (b.guests ?? 0), 0) / bookings.length
      : 0,
  };

  // ── AI Insights prompt ──────────────────────────────────
  const prompt = `You are a sharp restaurant business analyst. Based on the data below, write a concise 5-6 bullet point insight report for the restaurant owner. Focus on actionable recommendations.

MENU (${dishes.length} items):
${JSON.stringify(dishes.slice(0, 8), null, 2)}

RECENT BOOKINGS (${bookings.length} total, showing last 5):
${JSON.stringify(bookings.slice(0, 5), null, 2)}

RECENT ORDERS (${orders.length} total, showing last 5):
${JSON.stringify(orders.slice(0, 5), null, 2)}

STATS:
- Total Revenue from sample: ₹${stats.totalRevenue.toFixed(2)}
- Average guests per booking: ${stats.avgGuests.toFixed(1)}
- Average protein per dish: ${stats.avgProtein.toFixed(1)}g

Write 5-6 bullet points (use • symbol) covering:
• Best performing category / most popular dish type
• Booking patterns and peak time suggestions
• Revenue insights and upsell opportunities
• Menu gap or improvement suggestion
• One specific actionable recommendation for this week

Keep each bullet to 1-2 sentences. Be specific with numbers from the data. Tone: professional but direct.`;

  let insights = '';

  // ── Try Gemini → Groq fallback ──────────────────────────
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('No GEMINI_API_KEY');

    const genAI  = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model  = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { maxOutputTokens: 512, temperature: 0.4 },
    });
    const result = await model.generateContent(prompt);
    insights     = result.response.text();

  } catch (geminiErr) {
    console.warn('[Analytics] Gemini failed, trying Groq:', (geminiErr as Error).message);

    try {
      if (!process.env.GROQ_API_KEY) throw new Error('No GROQ_API_KEY');

      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const res  = await groq.chat.completions.create({
        model:      'llama3-8b-8192',
        messages:   [{ role: 'user', content: prompt }],
        max_tokens: 512,
        temperature: 0.4,
      });
      insights = res.choices[0].message.content ?? '';

    } catch (groqErr) {
      console.error('[Analytics] Both AI providers failed:', groqErr);
      insights = dishes.length === 0
        ? '• No menu data yet — add dishes via the Inventory tab to unlock AI insights.\n• Run supabase/schema.sql to seed 10 sample dishes instantly.'
        : `• You have ${dishes.length} dishes across multiple categories.\n• Add your Gemini or Groq API key in .env.local to enable full AI analysis.\n• High Protein category is trending — consider adding 2-3 new protein-focused dishes.\n• Enable real-time bookings to track peak hours and optimize staffing.\n• Consider a loyalty program for repeat customers to boost retention.`;
    }
  }

  return NextResponse.json({ stats, insights });
}
