import { Dish, Order, RESTAURANT_SEED_DISHES } from './supabase';

export interface CustomerRecommendation {
  dish: Dish;
  reason: string;
  score: number;
}

export interface OwnerInsight {
  id: string;
  type: 'combo' | 'pairing' | 'category' | 'timing';
  title: string;
  description: string;
  metric?: string;
  confidence: 'high' | 'medium';
}

/**
 * Category pairing matrix to logically complete meals
 */
const CATEGORY_COMPLEMENTS: Record<string, string[]> = {
  'Main': ['Vegetarian', 'Drinks & Mocktails', 'Low Cal', 'Dessert'],
  'High Protein': ['Low Cal', 'Drinks & Mocktails', 'Vegetarian'],
  'Vegetarian': ['Main', 'Drinks & Mocktails', 'Dessert'],
  'Low Cal': ['High Protein', 'Drinks & Mocktails'],
};

/**
 * Lightweight data-driven customer recommendation engine.
 * Computes recommendation score:
 * score = coOccurrenceScore + categoryComplementScore + popularityScore + vegMatching
 */
export function getCustomerRecommendations(
  cartDishes: { id: string; name: string; category?: string; veg_type?: string }[],
  allDishes: Dish[],
  recentOrders: { dish_names?: string[]; items_detail?: { id?: string; name?: string }[] }[] = [],
  limit = 3
): CustomerRecommendation[] {
  if (!allDishes || allDishes.length === 0) return [];

  const cartDishIds = new Set(cartDishes.map((d) => d.id));
  const cartCategories = new Set(cartDishes.map((d) => d.category?.toLowerCase() || ''));

  // 1. Build co-occurrence map from orders if available
  const pairCounts = new Map<string, number>();
  for (const order of recentOrders) {
    const orderItems: string[] = [];
    if (order.items_detail && order.items_detail.length > 0) {
      order.items_detail.forEach((i) => { if (i.name) orderItems.push(i.name.toLowerCase()); });
    } else if (order.dish_names) {
      order.dish_names.forEach((name) => {
        const clean = name.replace(/^\d+x\s*/, '').toLowerCase().trim();
        orderItems.push(clean);
      });
    }

    // Check if any cart item is in this order
    const hasCartItem = cartDishes.some((cd) => orderItems.some((oi) => oi.includes(cd.name.toLowerCase())));
    if (hasCartItem && orderItems.length > 1) {
      orderItems.forEach((name) => {
        pairCounts.set(name, (pairCounts.get(name) || 0) + 1);
      });
    }
  }

  // 2. Score candidate dishes
  const candidates: CustomerRecommendation[] = [];

  for (const dish of allDishes) {
    // Never recommend items already in the cart
    if (cartDishIds.has(dish.id)) continue;
    if (dish.available === false) continue;

    let score = 0;
    let reason = 'Recommended for you';

    // A. Check empirical co-occurrence in orders
    const normalizedName = dish.name.toLowerCase();
    const timesPaired = pairCounts.get(normalizedName) || 0;
    if (timesPaired > 0) {
      score += timesPaired * 15;
      const anchorDish = cartDishes[0]?.name || 'your dish';
      reason = `Frequently ordered with ${anchorDish}`;
    }

    // B. Category complement pairing
    for (const cartDish of cartDishes) {
      const complements = CATEGORY_COMPLEMENTS[cartDish.category || ''] || [];
      if (complements.some((c) => c.toLowerCase() === (dish.category || '').toLowerCase())) {
        score += 8;
        if (score <= 10) {
          reason = `Complements your ${cartDish.name}`;
        }
      }
    }

    // C. Diversity boost (recommend something of a different category than cart)
    if (dish.category && !cartCategories.has(dish.category.toLowerCase())) {
      score += 5;
    }

    // D. Popularity / featured boost
    if (dish.is_featured) score += 3;
    if (dish.protein && dish.protein >= 30) score += 2;

    // Minimum baseline score
    score += Math.max(1, 10 - Math.abs(dish.price - 250) / 50);

    candidates.push({ dish, reason, score });
  }

  // Sort by score descending and take top N
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, limit);
}

/**
 * Generates honest, empirical insights for restaurant owners from real order history.
 * If data is insufficient (< 2 multi-item orders), returns empty array without inventing numbers.
 */
export function generateOwnerInsights(
  orders: Order[],
  dishes: Dish[]
): { hasEnoughData: boolean; insights: OwnerInsight[]; message?: string } {
  if (!orders || orders.length < 3) {
    return {
      hasEnoughData: false,
      insights: [],
      message: 'Not enough data yet. Insights will appear automatically once guests place more orders.',
    };
  }

  const multiItemOrders = orders.filter((o) => (o.dish_names && o.dish_names.length >= 2) || (o.items_detail && o.items_detail.length >= 2));

  if (multiItemOrders.length < 2) {
    return {
      hasEnoughData: false,
      insights: [],
      message: 'Not enough multi-item orders yet to analyze dish pairings.',
    };
  }

  // Count co-occurring pairs
  const pairFreq = new Map<string, { count: number; dishA: string; dishB: string }>();

  for (const order of multiItemOrders) {
    const rawNames: string[] = [];
    if (order.items_detail && order.items_detail.length > 0) {
      order.items_detail.forEach((i) => { if (i.name) rawNames.push(i.name.trim()); });
    } else if (order.dish_names) {
      order.dish_names.forEach((n) => rawNames.push(n.replace(/^\d+x\s*/, '').trim()));
    }

    const uniqueNames = Array.from(new Set(rawNames));
    for (let i = 0; i < uniqueNames.length; i++) {
      for (let j = i + 1; j < uniqueNames.length; j++) {
        const a = uniqueNames[i];
        const b = uniqueNames[j];
        const key = [a, b].sort().join(' + ');
        const existing = pairFreq.get(key) || { count: 0, dishA: a, dishB: b };
        existing.count += 1;
        pairFreq.set(key, existing);
      }
    }
  }

  const sortedPairs = Array.from(pairFreq.entries())
    .map(([key, data]) => ({ key, ...data }))
    .sort((a, b) => b.count - a.count);

  const insights: OwnerInsight[] = [];

  // Top combo pair insight
  if (sortedPairs.length > 0 && sortedPairs[0].count >= 2) {
    const top = sortedPairs[0];
    insights.push({
      id: 'insight-combo-1',
      type: 'combo',
      title: `Recommended Combo: ${top.dishA} + ${top.dishB}`,
      description: `Guests have frequently paired ${top.dishA} together with ${top.dishB} in ${top.count} separate orders. Consider offering this as an exclusive bundle.`,
      metric: `${top.count} Orders Paired`,
      confidence: top.count >= 4 ? 'high' : 'medium',
    });
  }

  // Second top pair if available
  if (sortedPairs.length > 1 && sortedPairs[1].count >= 2) {
    const second = sortedPairs[1];
    insights.push({
      id: 'insight-combo-2',
      type: 'pairing',
      title: `Cross-Selling Opportunity: ${second.dishA}`,
      description: `Strong order affinity with ${second.dishB}. Suggesting ${second.dishB} when guests select ${second.dishA} will increase average ticket size.`,
      metric: `${second.count} Cross-Orders`,
      confidence: second.count >= 4 ? 'high' : 'medium',
    });
  }

  // Dine-in vs Delivery category demand insight
  const dineInCount = orders.filter((o) => o.order_type === 'dine_in' || o.table_number).length;
  const deliveryCount = orders.filter((o) => o.order_type === 'delivery').length;

  if (dineInCount > deliveryCount * 2 && dineInCount >= 3) {
    insights.push({
      id: 'insight-channel-1',
      type: 'category',
      title: 'High Table Dine-In Engagement',
      description: `Dine-in orders account for over ${Math.round((dineInCount / orders.length) * 100)}% of your guest volume. Focus table merchandising on starters and mocktails.`,
      metric: `${dineInCount} Dine-In Sessions`,
      confidence: 'high',
    });
  }

  return {
    hasEnoughData: insights.length > 0,
    insights,
    message: insights.length === 0 ? 'Not enough data yet. More order history needed.' : undefined,
  };
}
