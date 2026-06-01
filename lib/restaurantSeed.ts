import { RESTAURANT_SEED_DISHES, RESTAURANT_TABLES, supabase } from './supabase';

export async function ensureRestaurantDishesSeeded() {
  try {
    const { data, error } = await supabase
      .from(RESTAURANT_TABLES.dishes)
      .select('id')
      .limit(1);

    if (error) {
      console.error('[restaurantSeed] Failed to check seeded dishes:', error);
      return;
    }

    if (!data || data.length === 0) {
      const { error: seedError } = await supabase
        .from(RESTAURANT_TABLES.dishes)
        .upsert(RESTAURANT_SEED_DISHES, { onConflict: 'id' });

      if (seedError) {
        console.error('[restaurantSeed] Failed to seed dishes:', seedError);
      }
    }
  } catch (error) {
    console.error('[restaurantSeed] Unexpected seed failure:', error);
  }
}