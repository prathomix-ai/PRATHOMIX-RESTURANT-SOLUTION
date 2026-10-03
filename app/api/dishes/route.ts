import { NextResponse } from 'next/server';
import { RESTAURANT_SEED_DISHES, RESTAURANT_TABLES, supabase, DEFAULT_RESTAURANT_ID } from '@/lib/supabase';
import { ensureRestaurantDishesSeeded } from '@/lib/restaurantSeed';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// High-speed memory cache for menu catalog
interface MenuCacheEntry {
  data: any[];
  expiresAt: number;
}
const menuCache = new Map<string, MenuCacheEntry>();

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(ip, 'general');
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        {
          status: 429,
          headers: { 'Retry-After': rateLimit.retryAfterHeader || '3' },
        }
      );
    }

    const url = new URL(req.url);
    const restaurantId = url.searchParams.get('restaurant_id') || DEFAULT_RESTAURANT_ID;
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '60', 10)));
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));

    const cacheKey = `${restaurantId}:${category || 'all'}:${search || 'none'}:${limit}:${offset}`;
    const cached = menuCache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
          'X-Cache': 'HIT',
        },
      });
    }

    await ensureRestaurantDishesSeeded();

    // Select explicit fields to reduce payload and avoid schema mismatches
    let query = supabase
      .from(RESTAURANT_TABLES.dishes)
      .select('id, name, description, price, category, image_url, available, calories, protein, is_featured, prep_time_minutes, spice_level, veg_type, modifiers, created_at')
      .order('created_at', { ascending: false });

    // Multi-tenant restaurant scoping
    if (restaurantId) {
      query = query.or(`restaurant_id.eq.${restaurantId},restaurant_id.is.null`);
    }

    if (category && category.toLowerCase() !== 'all') {
      query = query.ilike('category', `%${category}%`);
    }

    if (search && search.trim()) {
      query = query.or(`name.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`);
    }

    query = query.range(offset, offset + limit - 1);

    let { data, error } = await query;

    // Resilient fallback if custom columns do not exist in database schema
    if (error && (error.message?.includes('column') || error.code === '42703')) {
      let fallbackQuery = supabase
        .from(RESTAURANT_TABLES.dishes)
        .select('id, name, description, price, category, image_url, available, calories, protein, created_at')
        .order('created_at', { ascending: false });

      if (category && category.toLowerCase() !== 'all') {
        fallbackQuery = fallbackQuery.ilike('category', `%${category}%`);
      }

      if (search && search.trim()) {
        fallbackQuery = fallbackQuery.or(`name.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`);
      }

      fallbackQuery = fallbackQuery.range(offset, offset + limit - 1);
      const fallbackResult = await fallbackQuery;

      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      console.warn('[Dishes API] Query fallback triggered:', error.message);
      return NextResponse.json(RESTAURANT_SEED_DISHES);
    }

    const result = data && data.length > 0 ? data : RESTAURANT_SEED_DISHES;

    // Cache result in memory for 30 seconds
    menuCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + 30 * 1000,
    });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        'X-Cache': 'MISS',
      },
    });
  } catch (err: any) {
    return NextResponse.json(RESTAURANT_SEED_DISHES);
  }
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(ip, 'general');
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();

    // Invalidate cached dishes
    menuCache.clear();

    const { data, error } = await supabase
      .from(RESTAURANT_TABLES.dishes)
      .insert(body)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
