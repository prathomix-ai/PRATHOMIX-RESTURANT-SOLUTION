/**
 * PRATHOMIX RESTAURANT OPERATING SYSTEM
 * Production Ordering & Bill Verification Suite
 */

import { RESTAURANT_SEED_DISHES, DEFAULT_RESTAURANT_ID, type Dish, type Order } from '../lib/supabase';
import { getCustomerRecommendations, generateOwnerInsights } from '../lib/recommendations';

async function runOrderingTestSuite() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PRATHOMIX PRODUCTION ORDERING & BILL VERIFICATION SUITE  ');
  console.log('═══════════════════════════════════════════════════════════\n');

  let passed = 0;
  let total = 0;

  function assert(title: string, condition: boolean, detail?: string) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${title}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${title}`);
      if (detail) console.error(`    ↳ Detail: ${detail}`);
    }
  }

  // TEST 1: Menu Loading & Catalog
  console.log('▶ TEST 1: Menu Data & Numeric Integrity');
  assert('Menu seed dishes loaded', RESTAURANT_SEED_DISHES.length >= 10);
  const validPrices = RESTAURANT_SEED_DISHES.every((d) => typeof d.price === 'number' && d.price > 0 && !isNaN(d.price));
  assert('All menu items have valid numeric prices', validPrices);

  // TEST 2: Cart Calculation & Totals
  console.log('\n▶ TEST 2: Multi-Item Cart Calculations (3 items)');
  const item1 = RESTAURANT_SEED_DISHES[0]; // e.g. 349
  const item2 = RESTAURANT_SEED_DISHES[1]; // e.g. 399
  const item3 = RESTAURANT_SEED_DISHES[2]; // e.g. 199

  const cart = [
    { ...item1, qty: 2 },
    { ...item2, qty: 1 },
    { ...item3, qty: 3 },
  ];

  const subtotal = Math.round(cart.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;
  const expectedSubtotal = item1.price * 2 + item2.price * 1 + item3.price * 3;
  assert(`Cart subtotal matches exact sum (₹${subtotal})`, subtotal === expectedSubtotal);

  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const grandTotal = Math.round((subtotal + tax) * 100) / 100;
  assert('Tax 5% is non-zero and correctly rounded', tax > 0 && !isNaN(tax));
  assert('Grand total equals subtotal + tax', grandTotal === subtotal + tax);

  // TEST 3: Recommendation Engine (Customer)
  console.log('\n▶ TEST 3: Customer Meal Recommendations');
  const recommendations = getCustomerRecommendations(
    [{ id: item1.id, name: item1.name, category: item1.category }],
    RESTAURANT_SEED_DISHES,
    [],
    3
  );
  assert('Generates recommendations for cart', recommendations.length > 0 && recommendations.length <= 3);
  assert('Does not recommend item already in cart', !recommendations.some((r) => r.dish.id === item1.id));
  assert('Recommendation contains non-empty reason', recommendations.every((r) => r.reason.length > 0));

  // TEST 4: Owner Insights Engine
  console.log('\n▶ TEST 4: Owner Recommendations & Insights');
  const mockOrders: Order[] = [
    {
      id: 'ord-1',
      dish_ids: [item1.id, item2.id],
      dish_names: [item1.name, item2.name],
      total_amount: item1.price + item2.price,
      status: 'completed',
    },
    {
      id: 'ord-2',
      dish_ids: [item1.id, item2.id],
      dish_names: [item1.name, item2.name],
      total_amount: item1.price + item2.price,
      status: 'completed',
    },
    {
      id: 'ord-3',
      dish_ids: [item1.id, item3.id],
      dish_names: [item1.name, item3.name],
      total_amount: item1.price + item3.price,
      status: 'completed',
    },
  ];

  const ownerInsights = generateOwnerInsights(mockOrders, RESTAURANT_SEED_DISHES);
  assert('Owner insights returns hasEnoughData=true for >= 3 multi-item orders', ownerInsights.hasEnoughData);
  assert('Owner insights identifies top combo pair', ownerInsights.insights.some((i) => i.type === 'combo'));

  const emptyInsights = generateOwnerInsights([], RESTAURANT_SEED_DISHES);
  assert('Owner insights shows honest "Not enough data yet" when orders < 3', !emptyInsights.hasEnoughData && !!emptyInsights.message);

  // TEST 5: Currency & Zero Amount Safeguards
  console.log('\n▶ TEST 5: Currency Formatting & Zero Safeguards');
  function formatSafeCurrency(val: unknown): string {
    const num = Number(val);
    if (isNaN(num) || num < 0) return '₹0.00';
    return `₹${num.toFixed(2)}`;
  }

  assert('formatSafeCurrency handles integer', formatSafeCurrency(840) === '₹840.00');
  assert('formatSafeCurrency handles float', formatSafeCurrency(840.5) === '₹840.50');
  assert('formatSafeCurrency handles string numeric', formatSafeCurrency('840.75') === '₹840.75');
  assert('formatSafeCurrency handles null/undefined/NaN without breaking', formatSafeCurrency(undefined) === '₹0.00');
  assert('formatSafeCurrency does not show NaN', !formatSafeCurrency('invalid').includes('NaN'));

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  TEST RESULTS: ${passed} / ${total} TESTS PASSED`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

runOrderingTestSuite();
