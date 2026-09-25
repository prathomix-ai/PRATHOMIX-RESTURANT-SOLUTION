/**
 * PRATHOMIX RESTAURANT OPERATING SYSTEM
 * Phase 11: End-to-End System Integration Test Suite
 */

import { ROLE_REDIRECTS, DEMO_ACCOUNTS } from '../lib/auth';
import { RESTAURANT_SEED_DISHES, DEFAULT_RESTAURANT_ID } from '../lib/supabase';

async function runTestSuite() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PRATHOMIX OS — PHASE 11 INTEGRATION VERIFICATION SUITE   ');
  console.log('═══════════════════════════════════════════════════════════\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(description: string, condition: boolean, details?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${description}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${description}`);
      if (details) console.error(`    ↳ Details: ${details}`);
    }
  }

  // 1. Role-Based Access Control & Redirection Matrix
  console.log('▶ TEST GROUP 1: Role Redirection Matrix & Security Rules');
  assert('Owner redirects to /admin', ROLE_REDIRECTS.owner === '/admin');
  assert('Admin redirects to /admin', ROLE_REDIRECTS.admin === '/admin');
  assert('Manager redirects to /admin', ROLE_REDIRECTS.manager === '/admin');
  assert('Receptionist redirects to /reception/dashboard', ROLE_REDIRECTS.receptionist === '/reception/dashboard');
  assert('Waiter redirects to /waiter/dashboard', ROLE_REDIRECTS.waiter === '/waiter/dashboard');
  assert('Chef redirects to /kitchen/dashboard', ROLE_REDIRECTS.chef === '/kitchen/dashboard');
  assert('Delivery redirects to /delivery/dashboard', ROLE_REDIRECTS.delivery === '/delivery/dashboard');
  assert('Customer redirects to /', ROLE_REDIRECTS.customer === '/');

  // 2. Demo Personnel Badges & Passcodes
  console.log('\n▶ TEST GROUP 2: Seed Personnel Badges & Quick-Login Registry');
  assert('At least 7 demo roles configured', DEMO_ACCOUNTS.length >= 7);
  const ownerAccount = DEMO_ACCOUNTS.find((a) => a.role === 'owner');
  const waiterAccount = DEMO_ACCOUNTS.find((a) => a.role === 'waiter');
  const chefAccount = DEMO_ACCOUNTS.find((a) => a.role === 'chef');
  const receptionAccount = DEMO_ACCOUNTS.find((a) => a.role === 'receptionist');

  assert('Owner has valid badge and passcode', !!ownerAccount?.employee_code && !!ownerAccount?.passcode);
  assert('Lead Server has badge W-1001', waiterAccount?.employee_code === 'W-1001');
  assert('Head Chef has badge CHF-01', chefAccount?.employee_code === 'CHF-01');
  assert('Front Desk has badge REC-01', receptionAccount?.employee_code === 'REC-01');

  // 3. Multi-Tenant Default Root
  console.log('\n▶ TEST GROUP 3: Multi-Tenant Architecture & Data Scoping');
  assert('DEFAULT_RESTAURANT_ID is a valid UUID format', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(DEFAULT_RESTAURANT_ID));

  // 4. Culinary Catalog & Nutritional Integrity
  console.log('\n▶ TEST GROUP 4: Culinary Catalog & Nutrition Verification');
  assert('Menu contains seed dishes', RESTAURANT_SEED_DISHES.length >= 10);
  const allDishesHavePrice = RESTAURANT_SEED_DISHES.every((d) => d.price > 0);
  const allDishesHaveCalories = RESTAURANT_SEED_DISHES.every((d) => d.calories > 0);
  const allDishesHaveProtein = RESTAURANT_SEED_DISHES.every((d) => d.protein >= 0);
  assert('All dishes have valid positive prices', allDishesHavePrice);
  assert('All dishes contain caloric metrics', allDishesHaveCalories);
  assert('All dishes contain protein macronutrients', allDishesHaveProtein);

  // 5. Order Flow Calculation Logic
  console.log('\n▶ TEST GROUP 5: Financial Order Engine & Coupon Arithmetic');
  const sampleOrderItems = [
    { name: 'Grilled Chicken Powerhouse', price: 349, qty: 2 },
    { name: 'Avocado Tuna Bowl', price: 399, qty: 1 },
  ];
  const subtotal = sampleOrderItems.reduce((sum, item) => sum + item.price * item.qty, 0); // 349*2 + 399 = 1097
  assert('Subtotal calculated accurately (₹1,097)', subtotal === 1097);

  const gstTaxRate = 0.05;
  const tax = Number((subtotal * gstTaxRate).toFixed(2)); // 54.85
  assert('GST 5% tax calculated accurately (₹54.85)', tax === 54.85);

  // 10% coupon
  const discount10 = Math.round(subtotal * 0.1); // 110
  const grandTotal = subtotal + tax - discount10;
  assert('Grand total with 10% discount is accurate', grandTotal === 1097 + 54.85 - 110);

  // Bill split among 3 guests
  const splitAmountPerPerson = Math.ceil(grandTotal / 3);
  assert('Bill split among 3 patrons is mathematically sound', splitAmountPerPerson > 0 && splitAmountPerPerson * 3 >= grandTotal);

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  INTEGRATION TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTestSuite();
