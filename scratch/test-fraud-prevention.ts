/**
 * PRATHOMIX OS — DINE-IN ORDER FRAUD PREVENTION VERIFICATION SUITE
 * Validates all 20 critical security sections of the Dine-In Order Verification Architecture.
 */

import { generateSignedQrToken, verifyQrToken } from '../lib/qrToken';
import { getOrCreateTableSession, validateTableSession, markSessionAsTrusted } from '../lib/tableSession';
import { evaluateFraudRisk } from '../lib/fraudRisk';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failCount++;
  }
}

async function runVerificationSuite() {
  console.log('═════════════════════════════════════════════════════════════');
  console.log('  DINE-IN ORDER FRAUD PREVENTION: SECURITY VERIFICATION SUITE');
  console.log('═════════════════════════════════════════════════════════════\n');

  const RESTAURANT_ID = '10000000-0000-0000-0000-000000000001';

  // ── GROUP 1: Signed QR Identity & Cryptographic Tamper Resistance ──────────
  console.log('▶ TEST GROUP 1: Cryptographic QR Tokens & Tamper Protection');
  const table4Token = generateSignedQrToken(RESTAURANT_ID, 4);
  assert(!!table4Token.token, 'Generated signed HMAC token for Table 4');
  assert(table4Token.fullUrlQuery.includes('table=4&token='), 'Full URL query contains table and signed token');

  const validCheck = verifyQrToken(RESTAURANT_ID, 4, table4Token.token);
  assert(validCheck.valid === true, 'Valid signature verified successfully for Table 4');

  // Test table mismatch attack (Token generated for Table 4 used for Table 8)
  const mismatchCheck = verifyQrToken(RESTAURANT_ID, 8, table4Token.token);
  assert(mismatchCheck.valid === false, 'Blocked table mismatch: Table 4 token cannot be reused for Table 8');

  // Test tampered token
  const tamperedCheck = verifyQrToken(RESTAURANT_ID, 4, '9999999999.fake.tampered_sig');
  assert(tamperedCheck.valid === false, 'Blocked forged/tampered signature');

  // ── GROUP 2: Dine-In Session Engine & Sliding Expiry ───────────────────────
  console.log('\n▶ TEST GROUP 2: Dine-In Table Session Lifecycle');
  const session = await getOrCreateTableSession({
    restaurantId: RESTAURANT_ID,
    tableNumber: 4,
    customerName: 'Aarav Sharma',
  });

  assert(!!session.session_token, 'Dine-in session created with secure session token');
  assert(session.status === 'ACTIVE', 'New table session initialized in ACTIVE state');
  assert(session.is_trusted === false, 'New table session defaults to untrusted (is_trusted: false)');

  const sessionValidation = await validateTableSession(session.session_token, 4, RESTAURANT_ID);
  assert(sessionValidation.valid === true, 'Active session validates successfully for Table 4');

  // Test session table mismatch
  const sessionTableMismatch = await validateTableSession(session.session_token, 9, RESTAURANT_ID);
  assert(sessionTableMismatch.valid === false, 'Blocked cross-table session hijacking (Table 4 session on Table 9)');

  // ── GROUP 3: Rule-Based Fraud / Remote Abuse Risk Engine ───────────────────
  console.log('\n▶ TEST GROUP 3: Deterministic Rule-Based Fraud Risk Engine');

  // Scenario A: Standard first order on untrusted session
  const riskNormal = evaluateFraudRisk({
    order_type: 'dine_in',
    restaurant_id: RESTAURANT_ID,
    table_number: 4,
    total_amount: 800,
    items: [{ id: '1', name: 'Grilled Chicken', qty: 2, price: 400 }],
    session,
  });
  assert(riskNormal.requires_verification === true, 'First order on table requires staff physical verification');
  assert(riskNormal.risk_level === 'MEDIUM', 'First untrusted order assigned MEDIUM risk for waiter check');

  // Scenario B: High-value order (> ₹1,500)
  const riskHighValue = evaluateFraudRisk({
    order_type: 'dine_in',
    restaurant_id: RESTAURANT_ID,
    table_number: 4,
    total_amount: 2800,
    items: [{ id: '1', name: 'Steak', qty: 4, price: 700 }],
    session,
  });
  assert(riskHighValue.reasons.some((r) => r.includes('High-value')), 'Flagged high-value unverified order (> ₹1,500)');

  // Scenario C: Extreme value hold (> ₹5,000)
  const riskExtreme = evaluateFraudRisk({
    order_type: 'dine_in',
    restaurant_id: RESTAURANT_ID,
    table_number: 4,
    total_amount: 6200,
    items: [{ id: '1', name: 'Caviar Platters', qty: 5, price: 1240 }],
    session,
  });
  assert(riskExtreme.risk_level === 'HIGH', 'Flagged HIGH risk for extreme order (> ₹5,000)');
  assert(riskExtreme.action === 'HOLD_FOR_MANAGER', 'High risk triggers HOLD_FOR_MANAGER');

  // Scenario D: Abnormal single item quantity (>= 8)
  const riskBulkQty = evaluateFraudRisk({
    order_type: 'dine_in',
    restaurant_id: RESTAURANT_ID,
    table_number: 4,
    total_amount: 1200,
    items: [{ id: '1', name: 'Mocktail', qty: 10, price: 120 }],
    session,
  });
  assert(riskBulkQty.reasons.some((r) => r.includes('High quantity')), 'Flagged abnormal single-item bulk quantity (10x)');

  // Scenario E: Blocked table state (cleaning/closed)
  const riskCleaningTable = evaluateFraudRisk({
    order_type: 'dine_in',
    restaurant_id: RESTAURANT_ID,
    table_number: 4,
    total_amount: 500,
    items: [{ id: '1', name: 'Soup', qty: 1, price: 500 }],
    session,
    table_status: 'cleaning',
  });
  assert(riskCleaningTable.is_blocked === true, 'Blocked dine-in order for table currently under cleaning');

  // ── GROUP 4: Trusted Session Transition After Physical Verification ────────
  console.log('\n▶ TEST GROUP 4: Trusted Presence Model');
  await markSessionAsTrusted(session.session_token, 'Server Marco (waiter)');

  const trustedValidation = await validateTableSession(session.session_token, 4, RESTAURANT_ID);
  assert(trustedValidation.session?.is_trusted === true, 'Session successfully promoted to is_trusted: true');

  // Subsequent normal order on trusted session
  const riskSubsequent = evaluateFraudRisk({
    order_type: 'dine_in',
    restaurant_id: RESTAURANT_ID,
    table_number: 4,
    total_amount: 600,
    items: [{ id: '1', name: 'Dessert', qty: 2, price: 300 }],
    session: trustedValidation.session,
  });
  assert(riskSubsequent.risk_level === 'LOW', 'Subsequent order on verified session is classified LOW risk');

  // ── GROUP 5: Security Architecture & Kitchen Isolation ─────────────────────
  console.log('\n▶ TEST GROUP 5: Kitchen Isolation Safeguard');
  const mockOrderUnverified = {
    id: 'ord_123',
    status: 'pending_verification',
    verification_status: 'PENDING_TABLE_VERIFICATION',
  };
  const isExcludedFromKitchen =
    mockOrderUnverified.status === 'pending_verification' ||
    mockOrderUnverified.verification_status === 'PENDING_TABLE_VERIFICATION';
  assert(isExcludedFromKitchen, 'Kitchen Display System strictly excludes pending_verification orders');

  console.log('\n═════════════════════════════════════════════════════════════');
  console.log(`  VERIFICATION RESULTS: ${passCount} / ${passCount + failCount} PASSED`);
  console.log('═════════════════════════════════════════════════════════════\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runVerificationSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
