import { RESTAURANT_SEED_DISHES, RESTAURANT_TABLES, supabase } from './supabase';

let hasCheckedSeed = false;

export async function ensureRestaurantDishesSeeded() {
  if (hasCheckedSeed) return;

  try {
    const { data, error } = await supabase
      .from(RESTAURANT_TABLES.dishes)
      .select('id')
      .limit(1);

    if (error) {
      console.warn('[restaurantSeed] Failed to check seeded dishes:', error.message);
      return;
    }

    if (!data || data.length === 0) {
      const { error: seedError } = await supabase
        .from(RESTAURANT_TABLES.dishes)
        .upsert(RESTAURANT_SEED_DISHES, { onConflict: 'id' });

      if (seedError) {
        console.warn('[restaurantSeed] Failed to seed dishes:', seedError.message);
      }
    }

    hasCheckedSeed = true;
  } catch (error: any) {
    console.warn('[restaurantSeed] Unexpected seed check failure:', error?.message);
  }
}