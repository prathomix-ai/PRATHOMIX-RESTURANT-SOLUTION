import { RESTAURANT_SEED_DISHES, RESTAURANT_TABLES, supabase } from './supabase';

export async function ensureRestaurantDishesSeeded() {
  const { data, error } = await supabase
    .from(RESTAURANT_TABLES.dishes)
    .select('id')
    .limit(1);

  if (error) return;

  if (!data || data.length === 0) {
    await supabase
      .from(RESTAURANT_TABLES.dishes)
      .upsert(RESTAURANT_SEED_DISHES, { onConflict: 'id' });
  }
}