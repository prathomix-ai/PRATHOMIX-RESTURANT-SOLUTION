/**
 * PRATHOMIX High-Concurrency Load Testing Suite
 * Simulates 50, 100, 250, and 500 concurrent users performing realistic restaurant workflows:
 * - Customers browsing menu & placing idempotent orders
 * - Waiters querying ready queue & updating orders
 * - Chefs fetching KDS orders
 * - Reception viewing live tables & bookings
 * - Staff presence heartbeats
 * - Rate limit boundaries & error recovery
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function timedFetch(url, options = {}) {
  const start = performance.now();
  try {
    const res = await fetch(url, options);
    const duration = performance.now() - start;
    let body = null;
    try {
      body = await res.json();
    } catch {}
    return {
      status: res.status,
      ok: res.ok,
      duration,
      body,
    };
  } catch (err) {
    const duration = performance.now() - start;
    return {
      status: 0,
      ok: false,
      duration,
      error: err.message,
    };
  }
}

// User Action Simulation Generators
async function simulateCustomer(userId) {
  // 1. Browse menu
  const menuRes = await timedFetch(`${BASE_URL}/api/dishes`);
  
  // 2. Place order with idempotency key
  const idempotencyKey = `load-test-order-${userId}-${Date.now()}`;
  const orderRes = await timedFetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurant_id: '10000000-0000-0000-0000-000000000001',
      dish_ids: ['d1', 'd2'],
      dish_names: ['Grilled Salmon', 'Power Salad'],
      table_number: (userId % 20) + 1,
      total_amount: 1450,
      customer_name: `Patron #${userId}`,
      idempotency_key: idempotencyKey,
    }),
  });

  // 3. Double-tap simulation (same idempotency key)
  const doubleTapRes = await timedFetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurant_id: '10000000-0000-0000-0000-000000000001',
      dish_ids: ['d1', 'd2'],
      dish_names: ['Grilled Salmon', 'Power Salad'],
      table_number: (userId % 20) + 1,
      total_amount: 1450,
      customer_name: `Patron #${userId}`,
      idempotency_key: idempotencyKey,
    }),
  });

  return [menuRes, orderRes, doubleTapRes];
}

async function simulateWaiter(userId) {
  // 1. Poll serving queue
  const queueRes = await timedFetch(`${BASE_URL}/api/orders/serve?notifications=true`);

  // 2. Presence heartbeat
  const presenceRes = await timedFetch(`${BASE_URL}/api/presence/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: `waiter-${userId}`,
      role: 'waiter',
      name: `Server #${userId}`,
      status: 'active',
    }),
  });

  return [queueRes, presenceRes];
}

async function simulateChef(userId) {
  // 1. Fetch kitchen orders
  const ordersRes = await timedFetch(`${BASE_URL}/api/orders?status=placed,preparing,ready`);

  // 2. Heartbeat
  const presenceRes = await timedFetch(`${BASE_URL}/api/presence/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: `chef-${userId}`,
      role: 'chef',
      name: `Chef #${userId}`,
      status: 'active',
    }),
  });

  return [ordersRes, presenceRes];
}

async function simulateReception(userId) {
  // 1. Check bookings & orders
  const ordersRes = await timedFetch(`${BASE_URL}/api/orders?limit=20`);

  // 2. Heartbeat
  const presenceRes = await timedFetch(`${BASE_URL}/api/presence/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: `reception-${userId}`,
      role: 'receptionist',
      name: `Host #${userId}`,
      status: 'active',
    }),
  });

  return [ordersRes, presenceRes];
}

async function simulateAdmin(userId) {
  // 1. View staff presence (authenticated role header)
  const presenceRes = await timedFetch(`${BASE_URL}/api/presence`, {
    headers: { 'x-user-role': 'admin' },
  });

  // 2. Fetch orders
  const ordersRes = await timedFetch(`${BASE_URL}/api/orders?limit=50`);

  return [presenceRes, ordersRes];
}

async function runConcurrencyTier(concurrentUsers) {
  console.log(`\n======================================================`);
  console.log(`🚀 RUNNING BENCHMARK: ${concurrentUsers} CONCURRENT USERS`);
  console.log(`======================================================`);

  const startTime = performance.now();
  const promises = [];

  // Distribution: 60% Customers, 15% Waiters, 10% Chefs, 10% Reception, 5% Admin
  for (let i = 1; i <= concurrentUsers; i++) {
    const pct = (i / concurrentUsers) * 100;
    if (pct <= 60) {
      promises.push(simulateCustomer(i));
    } else if (pct <= 75) {
      promises.push(simulateWaiter(i));
    } else if (pct <= 85) {
      promises.push(simulateChef(i));
    } else if (pct <= 95) {
      promises.push(simulateReception(i));
    } else {
      promises.push(simulateAdmin(i));
    }
  }

  const results = await Promise.all(promises);
  const totalElapsed = (performance.now() - startTime) / 1000;

  // Flatten all individual HTTP requests
  const allRequests = results.flat();
  const totalRequests = allRequests.length;
  const successfulRequests = allRequests.filter((r) => r.ok || r.status === 200 || r.status === 201).length;
  const rateLimitedRequests = allRequests.filter((r) => r.status === 429).length;
  const failedRequests = allRequests.filter((r) => !r.ok && r.status !== 429).length;

  const latencies = allRequests.map((r) => r.duration).sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const max = latencies[latencies.length - 1] || 0;
  const avg = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
  const throughput = Math.round(totalRequests / totalElapsed);

  console.log(`⏱ Total Wall Time:        ${totalElapsed.toFixed(2)} seconds`);
  console.log(`📊 Total Requests Fired:    ${totalRequests}`);
  console.log(`✅ Successful Requests:    ${successfulRequests} (${Math.round((successfulRequests / totalRequests) * 100)}%)`);
  console.log(`🛡 Rate-Limited (429):     ${rateLimitedRequests}`);
  console.log(`❌ Failed Requests:        ${failedRequests}`);
  console.log(`⚡ Throughput:             ${throughput} req/sec`);
  console.log(`📈 Latency P50:            ${Math.round(p50)} ms`);
  console.log(`📈 Latency P95:            ${Math.round(p95)} ms`);
  console.log(`📈 Latency Max:            ${Math.round(max)} ms`);
  console.log(`📈 Latency Avg:            ${Math.round(avg)} ms`);

  return {
    concurrentUsers,
    totalRequests,
    successfulRequests,
    rateLimitedRequests,
    failedRequests,
    p50: Math.round(p50),
    p95: Math.round(p95),
    throughput,
  };
}

async function main() {
  console.log(`Starting PRATHOMIX Scalability Audit Suite against ${BASE_URL}...`);

  const tiers = [50, 100, 250, 500];
  const summary = [];

  for (const tier of tiers) {
    const result = await runConcurrencyTier(tier);
    summary.push(result);
    // Pause 1s between tiers to let event loop settle
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\n======================================================`);
  console.log(`📋 BENCHMARK SUMMARY REPORT`);
  console.log(`======================================================`);
  console.table(summary);
}

main().catch(console.error);
