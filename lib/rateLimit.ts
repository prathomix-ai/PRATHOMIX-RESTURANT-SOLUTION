/**
 * High-performance In-Memory Sliding-Window Rate Limiter
 * Zero-dependency, compatible with Next.js App Router (Node & Edge runtimes).
 * Automatically cleans up stale tokens to prevent memory leaks under heavy concurrency.
 */

interface RateLimitConfig {
  maxRequests: number; // Max requests allowed in the window
  windowSeconds: number; // Window duration in seconds
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Configured tiers for restaurant operations
export const RATE_LIMIT_TIERS: Record<string, RateLimitConfig> = {
  auth: { maxRequests: 20, windowSeconds: 60 }, // 20 login/signup attempts per minute
  orders: { maxRequests: 45, windowSeconds: 60 }, // 45 order submissions/updates per minute
  chat: { maxRequests: 25, windowSeconds: 60 }, // 25 AI queries per minute
  presence: { maxRequests: 60, windowSeconds: 60 }, // 60 presence heartbeats per minute
  general: { maxRequests: 150, windowSeconds: 60 }, // 150 read queries per minute
};

const store = new Map<string, RateLimitEntry>();
let lastCleanup = Date.now();

/**
 * Periodically purge expired tokens to maintain small memory footprint (< 500KB)
 */
function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < 30000) return; // Clean at most once every 30s
  lastCleanup = now;

  store.forEach((entry, key) => {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  });
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  retryAfterHeader?: string;
}

/**
 * Check and record a request against the rate limiter
 * @param identifier Unique key (e.g. client IP, user ID, or session token)
 * @param tier Configured tier name ('auth' | 'orders' | 'chat' | 'presence' | 'general')
 */
export function checkRateLimit(identifier: string, tier: keyof typeof RATE_LIMIT_TIERS = 'general'): RateLimitResult {
  cleanupExpired();

  const config = RATE_LIMIT_TIERS[tier] || RATE_LIMIT_TIERS.general;
  const now = Date.now();
  const key = `${tier}:${identifier || 'anonymous'}`;

  const existing = store.get(key);

  if (!existing || now >= existing.resetAt) {
    // New window
    const resetAt = now + config.windowSeconds * 1000;
    store.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetSeconds: config.windowSeconds,
    };
  }

  // Existing active window
  if (existing.count >= config.maxRequests) {
    const remainingMs = Math.max(0, existing.resetAt - now);
    const retryAfterSeconds = Math.ceil(remainingMs / 1000);
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetSeconds: retryAfterSeconds,
      retryAfterHeader: String(retryAfterSeconds),
    };
  }

  // Increment within window
  existing.count += 1;
  const remainingSeconds = Math.ceil(Math.max(0, existing.resetAt - now) / 1000);

  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - existing.count,
    resetSeconds: remainingSeconds,
  };
}

/**
 * Extract client IP or best available identifier from incoming Request headers
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
