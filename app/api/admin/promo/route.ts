import { NextResponse } from 'next/server';
import { generateRestaurantText } from '@/lib/llm';

type PromoBody = {
  dishName?: string;
  dishDescription?: string;
  category?: string;
  price?: number;
};

export async function POST(req: Request) {
  const body = (await req.json()) as PromoBody;
  const dishName = String(body.dishName ?? '').trim();

  if (!dishName) {
    return NextResponse.json({ error: 'Missing dishName' }, { status: 400 });
  }

  const prompt = `You are a premium restaurant marketing assistant. Write one short Instagram caption or SMS promo for ${dishName}.

Details:
- Dish: ${dishName}
- Description: ${body.dishDescription ?? 'Not provided'}
- Category: ${body.category ?? 'Not provided'}
- Menu price: ${body.price ? `₹${body.price}` : 'Not provided'}

Requirements:
- Mention a small, enticing discount or limited-time offer.
- Keep it catchy, elegant, and sales-focused.
- Return the final copy only.
- Maximum 3 lines.`;

  const fallback = `Treat yourself to ${dishName} today. Enjoy a limited-time offer and bring home a little extra flavour with your next order.`;

  const text = await generateRestaurantText(prompt, fallback, {
    maxOutputTokens: 180,
    temperature: 0.75,
  });

  return NextResponse.json({ text });
}