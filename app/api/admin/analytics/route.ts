import { NextResponse } from 'next/server';
import { RESTAURANT_SEED_DISHES, RESTAURANT_TABLES, supabase } from '@/lib/supabase';
import { generateRestaurantText } from '@/lib/llm';

const DUMMY_FEEDBACK = [
  { rating: 5, comment: 'The chicken dishes are always fresh, flavorful, and served beautifully.' },
  { rating: 4, comment: 'Service is warm and attentive, but the dinner rush can take a little too long.' },
  { rating: 5, comment: 'The ambience feels premium and the vegetarian options are genuinely strong.' },
  { rating: 3, comment: 'Loved the taste, but a few dishes could use slightly faster delivery to the table.' },
  { rating: 4, comment: 'Great portions and the dessert specials have become a favorite for repeat visits.' },
];

const INGREDIENT_RULES: Array<{ terms: string[]; ingredients: string[] }> = [
  { terms: ['chicken', 'shawarma', 'slider', 'biryani', 'lentil soup', 'powerhouse', 'pesto pasta'], ingredients: ['chicken breast', 'basmati rice', 'herbs'] },
  { terms: ['paneer', 'dal', 'rajma', 'falafel', 'veggie', 'quinoa'], ingredients: ['paneer', 'lentils', 'greens'] },
  { terms: ['salmon', 'tuna', 'teriyaki'], ingredients: ['salmon fillet', 'fresh fish', 'broccoli'] },
  { terms: ['omelette', 'egg white'], ingredients: ['egg whites', 'peppers', 'mushrooms'] },
  { terms: ['wrap', 'pita', 'burger', 'bhature'], ingredients: ['bread', 'flour', 'fresh vegetables'] },
];

function inferIngredients(dishName: string) {
  const lower = dishName.toLowerCase();
  const ingredients = new Set<string>();

  for (const rule of INGREDIENT_RULES) {
    if (rule.terms.some((term) => lower.includes(term))) {
      rule.ingredients.forEach((ingredient) => ingredients.add(ingredient));
    }
  }

  if (ingredients.size === 0) {
    ingredients.add('seasonal produce');
    ingredients.add('core pantry items');
  }

  return Array.from(ingredients);
}

function getWeekdayLabel(daysAhead: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export async function GET() {
  // ── Fetch raw data in parallel ──────────────────────────
  const [dishRes, bookRes, orderRes] = await Promise.all([
    supabase.from(RESTAURANT_TABLES.dishes).select('name, price, calories, protein, category'),
    supabase.from(RESTAURANT_TABLES.bookings).select('customer_name, date, time, guests, status').order('created_at', { ascending: false }).limit(20),
    supabase.from(RESTAURANT_TABLES.orders).select('total_amount, split_count, created_at').order('created_at', { ascending: false }).limit(20),
  ]);

  const dishes   = (dishRes.data && dishRes.data.length > 0 ? dishRes.data : RESTAURANT_SEED_DISHES) ?? [];
  const bookings = bookRes.data   ?? [];
  const orders   = orderRes.data  ?? [];

  const recentDishSales = new Map<string, number>();
  const ingredientDemand = new Map<string, number>();

  for (const order of orders as any[]) {
    for (const dishName of order.dish_names ?? []) {
      const normalizedName = String(dishName).trim();
      recentDishSales.set(normalizedName, (recentDishSales.get(normalizedName) ?? 0) + 1);

      for (const ingredient of inferIngredients(normalizedName)) {
        ingredientDemand.set(ingredient, (ingredientDemand.get(ingredient) ?? 0) + 1);
      }
    }
  }

  const topIngredientEntry = Array.from(ingredientDemand.entries()).sort((a, b) => b[1] - a[1])[0];
  const topIngredient = topIngredientEntry?.[0] ?? 'seasonal produce';
  const topIngredientDemand = topIngredientEntry?.[1] ?? 0;
  const projectedDays = Math.max(2, Math.min(7, Math.round(18 / Math.max(1, topIngredientDemand))));
  const projectedDay = getWeekdayLabel(projectedDays);

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

  const salesByDish = dishes.map((dish: any) => ({
    name: dish.name,
    sales: recentDishSales.get(dish.name) ?? 0,
  })).sort((a, b) => a.sales - b.sales);

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

  const insightsFallback = dishes.length === 0
    ? '• No menu data yet — add dishes via the Inventory tab to unlock AI insights.\n• Run supabase/schema.sql to seed sample dishes instantly.'
    : `• You have ${dishes.length} dishes across multiple categories.\n• Add your Gemini or Groq API key in .env.local to enable full AI analysis.\n• High Protein category is trending — consider adding 2-3 new protein-focused dishes.\n• Enable real-time bookings to track peak hours and optimize staffing.\n• Consider a loyalty program for repeat customers to boost retention.`;

  const inventoryPrompt = `You are a restaurant inventory planner. Write one concise warning card, no more than 2 sentences, in this exact tone:
Based on current order velocity, you are likely to run out of ${topIngredient} by ${projectedDay}. Suggest reordering.

Use the order trend and ingredient mapping below to keep the warning credible:
- Top ingredient demand: ${topIngredient}
- Estimated demand count: ${topIngredientDemand}
- Recent dish sales: ${JSON.stringify(salesByDish.slice(0, 6), null, 2)}

Keep the message polished, practical, and short.`;

  const sentimentPrompt = `You are summarizing customer feedback for a premium restaurant. Use the dummy feedback below and write exactly 2 sentences.

Feedback:
${JSON.stringify(DUMMY_FEEDBACK, null, 2)}

Sentence 1 should explain what guests love most.
Sentence 2 should explain what needs improvement.
Keep the tone warm, balanced, and polished.`;

  const [insights, inventoryPrediction, sentimentSummary] = await Promise.all([
    generateRestaurantText(prompt, insightsFallback, { maxOutputTokens: 512, temperature: 0.4 }),
    generateRestaurantText(inventoryPrompt, `Based on current order velocity, you are likely to run out of ${topIngredient} by ${projectedDay}. Suggest reordering.`, { maxOutputTokens: 160, temperature: 0.35 }),
    generateRestaurantText(sentimentPrompt, 'Guests love the premium ambience, flavorful dishes, and attentive service. They would like faster table turnaround during busy periods.', { maxOutputTokens: 120, temperature: 0.4 }),
  ]);

  return NextResponse.json({ stats, insights, inventoryPrediction, sentimentSummary, salesByDish });
}
