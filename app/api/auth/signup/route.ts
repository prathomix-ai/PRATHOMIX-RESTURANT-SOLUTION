import { NextResponse } from 'next/server';
import { supabase, RESTAURANT_TABLES, DEFAULT_RESTAURANT_ID } from '@/lib/supabase';
import { ROLE_REDIRECTS, type AuthUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      account_type, // 'customer' | 'owner'
      name,
      email,
      phone,
      password,
      restaurant_name,
      restaurant_address,
      city,
      restaurant_type,
    } = body;

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '').trim();
    const cleanName = String(name || '').trim();
    const cleanPhone = String(phone || '').trim();

    if (!cleanEmail || !cleanPassword || !cleanName) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    if (cleanPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // ── 1. Restaurant Owner Signup ──────────────────────────────────────────
    if (account_type === 'owner') {
      const cleanRestaurantName = String(restaurant_name || '').trim();
      if (!cleanRestaurantName) {
        return NextResponse.json({ error: 'Restaurant name is required for owner account' }, { status: 400 });
      }

      const slug = cleanRestaurantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + `-${Math.floor(1000 + Math.random() * 9000)}`;

      const restaurantId = crypto.randomUUID();
      const ownerId = crypto.randomUUID();

      // Create restaurant record
      const { error: restError } = await supabase.from(RESTAURANT_TABLES.restaurants).insert({
        id: restaurantId,
        name: cleanRestaurantName,
        slug,
        phone: cleanPhone,
        email: cleanEmail,
        address: restaurant_address || 'Main Road',
        city: city || 'Metropolis',
        cuisine_type: restaurant_type || 'Fine Dining & Lounge',
      });

      if (restError) {
        console.warn('Supabase restaurant insert notice:', restError.message);
      }

      // Create owner profile
      const ownerProfile = {
        id: ownerId,
        restaurant_id: restaurantId,
        role: 'owner',
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        passcode: cleanPassword,
        status: 'active',
        permissions: ['*'],
      };

      const { error: profError } = await supabase.from(RESTAURANT_TABLES.profiles).insert(ownerProfile);
      if (profError) {
        console.warn('Supabase profile insert notice:', profError.message);
      }

      // Create initial 10 tables for the new restaurant
      const initialTables = Array.from({ length: 10 }, (_, i) => ({
        restaurant_id: restaurantId,
        table_number: i + 1,
        capacity: i < 2 ? 2 : i > 7 ? 8 : 4,
        section: i < 4 ? 'Terrace' : i < 8 ? 'Main Hall' : 'VIP Lounge',
        status: 'available',
      }));

      await supabase.from(RESTAURANT_TABLES.restaurantTables).insert(initialTables);

      // Create default categories
      const initialCategories = ['High Protein', 'Main', 'Vegetarian', 'Low Cal', 'Dessert', 'Drinks'].map(
        (catName, index) => ({
          restaurant_id: restaurantId,
          name: catName,
          display_order: index + 1,
        })
      );
      await supabase.from(RESTAURANT_TABLES.categories).insert(initialCategories);

      const authUser: AuthUser = {
        id: ownerId,
        restaurant_id: restaurantId,
        role: 'owner',
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        status: 'active',
      };

      const response = NextResponse.json({
        success: true,
        user: authUser,
        redirectTo: ROLE_REDIRECTS.owner,
      });

      response.cookies.set('prathomix_staff_role', 'owner', {
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        sameSite: 'lax',
      });

      response.cookies.set('prathomix_user_session', JSON.stringify(authUser), {
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        sameSite: 'lax',
      });

      return response;
    }

    // ── 2. Customer Signup ──────────────────────────────────────────────────
    const customerId = crypto.randomUUID();
    const customerProfile = {
      id: customerId,
      restaurant_id: DEFAULT_RESTAURANT_ID,
      role: 'customer',
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      passcode: cleanPassword,
      status: 'active',
    };

    const { error: custError } = await supabase.from(RESTAURANT_TABLES.profiles).insert(customerProfile);
    if (custError) {
      console.warn('Customer profile insert notice:', custError.message);
    }

    // Also record in CRM customers table
    await supabase.from(RESTAURANT_TABLES.customers).insert({
      restaurant_id: DEFAULT_RESTAURANT_ID,
      name: cleanName,
      phone: cleanPhone || `guest-${Date.now()}`,
      email: cleanEmail,
      loyalty_tier: 'new',
    });

    const authUser: AuthUser = {
      id: customerId,
      restaurant_id: DEFAULT_RESTAURANT_ID,
      role: 'customer',
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      status: 'active',
    };

    const response = NextResponse.json({
      success: true,
      user: authUser,
      redirectTo: ROLE_REDIRECTS.customer,
    });

    response.cookies.set('prathomix_staff_role', 'customer', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
    });

    response.cookies.set('prathomix_user_session', JSON.stringify(authUser), {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    console.error('Signup API error:', error);
    return NextResponse.json({ error: error?.message || 'Signup failed' }, { status: 500 });
  }
}
